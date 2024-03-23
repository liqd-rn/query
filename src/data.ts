import { State } from '@liqd-rn/state';
import Timer from '@liqd-rn/timer';
import type { QueryFn, QueryDataState, QueryRefetchOptions, QueryInvalidateOptions, QueryDataOptions } from './types';

type QueryFetchOptions = QueryRefetchOptions & { force?: false };

const MAX_FETCH_INTERVAL = 50;
const QueryTimer = new Timer();

export default class QueryData<T>
{
    private static instanceID = 0;

    //@ts-ignore
    private id          : number = ++QueryData.instanceID;
    private version     : number = 0;
    private lastFetch   : { fetchedAt: number, promise: Promise<void> } | undefined;
    private query       : QueryFn<T>;
    private events      = { updatedAt: 0, expiredAt: 0 };
    private options     : 
    {
        staleTime   : number
        cacheTime   : number
    };

    public state        : State<QueryDataState<T>>;
    
    constructor( query: QueryFn<T>, options: QueryDataOptions = {})
    {
        this.options = 
        {
            staleTime   : options.staleTime ?? Infinity, 
            cacheTime   : Math.max( 0.1, options.cacheTime ?? 0 )
        };

        this.state = new State(
        {
            data        : undefined,
            error       : undefined,
            isError     : false,
            isPreset    : false,
            isFetching  : false,
            set         : this.set.bind( this ),
            refetch     : this.fetch.bind( this )
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

    private updateState( update: Partial<QueryDataState<T>>, silent?: true )
    {
        const state = this.state.get()!;

        Object.entries( update ).forEach(([ key, value ]) => (state as any)[ key ] = value );
        
        ( silent !== true ) && this.state.set( state );
    }

    public get(): T | undefined
    {
        return this.state.get()!.data;
    }

    public use(): QueryDataState<T>
    {
        const state = this.state.get()!;

        if( !state.isFetching && ( state.isPreset || state.data === undefined ))
        {
            this.fetch();
        }

        QueryTimer.unset( this.id + '_cache' );

        return this.state.use()!;
    }

    public preset( value: T ): boolean
    {
        const state = this.state.get()!;

        if( state.data === undefined )
        {
            this.updateState({ data: value, error: undefined, isError: false, isPreset: true, isFetching: false });
        }

        return ( state.data !== undefined );
    }

    public set( value: T, options: QueryDataOptions = {}): boolean
    {
        ++this.version;

        this.lastFetch = undefined;
        this.events.updatedAt = Date.now();

        this.updateState({ data: value, error: undefined, isError: false, isPreset: false, isFetching: false });

        this.scheduleInvalidate( options.staleTime );

        return true;
    }

    public patch( update: Partial<T> ): boolean
    {
        const state = this.state.get()!;

        if( state.data !== undefined )
        {
            ++this.version;

            this.updateState({ data: { ...state.data, ...update } });

            // TODO force additional refetch if one is in progress
        }

        return ( state.data !== undefined );
    }

    public unset(): boolean
    {
        ++this.version;

        this.lastFetch = undefined;
        this.events.updatedAt = 0;

        this.updateState({ data: undefined, error: undefined, isError: false, isPreset: false, isFetching: false });
        
        this.scheduleInvalidate( Infinity );

        return true;
    }

    public async invalidate( options: QueryInvalidateOptions = {}): Promise<void>
    {
        (( 'unset' in options && options.unset ) || !this.state.active ) && this.unset();

        this.events.expiredAt = Date.now();

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
        // TODO ak prvy bol silent a tento nie je emitnut stav fetchovania isFetching

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
                            let version = ++this.version, data = this.query();

                            if( data instanceof Promise )
                            {
                                this.updateState({ isFetching: true }, options.silent );

                                data = await data;

                                if( version !== this.version )
                                {
                                    return this.lastFetch ? this.lastFetch.promise.then( resolve ).catch( reject ) : resolve();
                                }
                            }

                            this.updateState({ data: data, error: undefined, isError: false, isPreset: false, isFetching: false });

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
}