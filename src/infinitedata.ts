import { State } from '@liqd-rn/state';
import Timer from '@liqd-rn/timer';
import type { InfiniteQueryFn, QueryRefetchOptions, QueryInvalidateOptions, QueryDataOptions, InfiniteQueryDataState, InfiniteQueryFetchPageOptions } from './types';

type QueryFetchOptions = QueryRefetchOptions & { force?: false };

const MAX_FETCH_INTERVAL = 50;
const QueryTimer = new Timer();

//TODO param to say which end can receive more data and do refetches

export default class InfiniteQueryData<T,P>
{
    private static instanceID = 0;

    //@ts-ignore
    private id          : number = ++InfiniteQueryData.instanceID;
    private version     : number = 0;
    private lastFetch   : { fetchedAt: number, promise: Promise<void> } | undefined;
    private query       : InfiniteQueryFn<T,P>;
    private events      = { updatedAt: 0, expiredAt: 0 };
    private options     : 
    {
        staleTime   : number
        cacheTime   : number
    };

    private prevPage    : P | undefined;
    private nextPage    : P | undefined;
    private pageFetch   : { prev?: Promise<void>, next?: Promise<void> } = {};

    public state        : State<InfiniteQueryDataState<T>>;
    
    constructor( query: InfiniteQueryFn<T,P>, options: QueryDataOptions = {})
    {
        this.options = 
        {
            staleTime   : options.staleTime ?? Infinity, 
            cacheTime   : Math.max( 0.1, options.cacheTime ?? 0 )
        };

        this.state = new State(
        {
            data                : undefined,
            error               : undefined,
            isError             : false,
            isPreset            : false,
            isFetching          : false,
            hasNextPage         : false,
            isFetchingNextPage  : false,
            refetch             : this.fetch.bind( this ),
            fetchNextPage       : ( options: Omit<InfiniteQueryFetchPageOptions, 'direction'> = {}) => this.fetchPage({ ...options, direction: 'next' }),
        },
        {
            cache: true,
            onRelease   : () => 
            {
                QueryTimer.set( this.id + '_cache', () => { console.log( '*** QUERY Cache cleared ***' );  this.unset(); options.onRelease?.() }, this.options.cacheTime * 1000 );
            }
        });

        this.query = query;
    }

    public get updatedAt(){ return this.events.updatedAt }
    public get expiredAt(){ return this.events.expiredAt }

    public get isActive(){ return this.state.active }

    private scheduleInvalidate( staleTime: number = this.options.staleTime )
    {
        if( staleTime !== Infinity && this.state.get()?.data !== undefined )
        {
            QueryTimer.set( this.id + '_stale', () => { console.log( '*** QUERY Staled ***' ); this.invalidate({ silent: true, soft: true })}, staleTime * 1000 );
        }
        else{ QueryTimer.unset( this.id + '_stale' )}
        // TODO cacheTime
    }

    private updateState( update: Partial<InfiniteQueryDataState<T>>, silent?: true )
    {
        const state = this.state.get()!;

        Object.entries( update ).forEach(([ key, value ]) => (state as any)[ key ] = value );
        
        ( silent !== true ) && this.state.set( state );
    }

    public get(): T[] | undefined
    {
        return this.state.get()!.data;
    }

    public use(): InfiniteQueryDataState<T>
    {
        const state = this.state.get()!;

        if( !state.isFetching && ( state.isPreset || state.data === undefined ))
        {
            this.fetch();
        }

        QueryTimer.unset( this.id + '_cache' );

        return this.state.use()!;
    }

    public unset(): boolean
    {
        ++this.version;

        this.lastFetch = undefined;
        this.events.updatedAt = 0;
        this.prevPage = this.nextPage = undefined;

        this.updateState(
        { 
            data: undefined, error: undefined, isError: false, isPreset: false, isFetching: false, 
            hasNextPage: false, isFetchingNextPage: false
        });
        
        this.scheduleInvalidate( Infinity );

        return true;
    }

    public async invalidate( options: QueryInvalidateOptions = {}): Promise<void>
    {
        (( 'unset' in options && options.unset ) || !this.state.active ) && this.unset();

        this.events.expiredAt = Date.now();
        this.prevPage = this.nextPage = undefined;

        if( this.state.active )
        {
            await this.fetch(
            { 
                force   : 'soft' in options && options.soft ? false : undefined, 
                silent  : 'silent' in options ? options.silent : undefined
            });
        }
        else{ console.log('*** QUERY Inactive') }
    }

    public async refetch( options: QueryRefetchOptions = {}): Promise<void>
    {
        return this.fetch( options );
    }
    
    private async fetch( options: QueryFetchOptions = {}): Promise<void>
    {
        if( !this.lastFetch || Date.now() - this.lastFetch.fetchedAt >= MAX_FETCH_INTERVAL )
        {
            this.lastFetch = 
            {
                fetchedAt: Date.now(),
                promise: new Promise<void>( async ( resolve, reject ) =>
                {
                    const state = this.state.get()!;

                    if( options.force !== false || !state.isFetching )
                    {
                        try
                        {
                            let version = ++this.version, page = this.query();

                            if( page instanceof Promise )
                            {
                                this.updateState({ isFetching: true }, options.silent );

                                page = await page;

                                if( version !== this.version )
                                {
                                    return this.lastFetch ? this.lastFetch.promise.then( resolve ).catch( reject ) : resolve();
                                }
                            }

                            this.prevPage = page?.prevPage;
                            this.nextPage = page?.nextPage;

                            this.updateState(
                            { 
                                data: page?.data, error: undefined, isError: false, isPreset: false, isFetching: false, 
                                hasNextPage: this.nextPage !== undefined, isFetchingNextPage: false
                            });

                            this.scheduleInvalidate();
                        }
                        catch( e )
                        {
                            //TODO retries OR sucessfull fetch in between, mozno error
                            
                            this.scheduleInvalidate( 2 );
                        }
                    }

                    resolve();
                })
            }
        }

        await this.lastFetch.promise;
    }

    private async fetchPage( options: InfiniteQueryFetchPageOptions ): Promise<void>
    {
        const state = this.state.get()!;

        // TODO next/prev
        if( !this.pageFetch[options.direction] && !state.isFetching && state.hasNextPage && !state.isFetchingNextPage )
        {
            this.pageFetch[options.direction] = new Promise<void>( async ( resolve, reject ) =>
            {
                if( options.direction === 'prev' ? this.prevPage : this.nextPage )
                {
                    try
                    {
                        let version = this.version, page = this.query({ param: ( options.direction === 'prev' ? this.prevPage : this.nextPage )!, direction: options.direction });

                        if( page instanceof Promise )
                        {
                            //options.silent ? ( state.isFetching = true ) : this.state.set(
                            this.updateState({ isFetchingNextPage: true }, options.silent );

                            page = await page;

                            if( version !== this.version )
                            {
                                return this.lastFetch ? this.lastFetch.promise.then( resolve ).catch( reject ) : resolve();
                            }
                        }

                        this.prevPage = page?.prevPage;
                        this.nextPage = page?.nextPage;

                        this.updateState(
                        {
                            data: [ ...( state.data ?? [] ), ...( page?.data ?? [] )],
                            error: undefined, isError: false, isPreset: false, isFetching: false,
                            hasNextPage: this.nextPage !== undefined, isFetchingNextPage: false
                        });
                        
                        //this.scheduleInvalidate();
                    }
                    catch( e )
                    {
                        //TODO retries OR sucessfull fetch in between

                        //this.scheduleInvalidate( 2 );
                    }
                }

                resolve();
            })
        }

        await this.pageFetch[options.direction];
    }
}