import { State } from '@liqd-rn/state';
import type { QueryFn, QueryDataState, QueryRefetchOptions, QueryInvalidateOptions, QueryDataOptions } from './types';

type QueryFetchOptions = QueryRefetchOptions & { force?: false };

const MAX_FETCH_INTERVAL = 50;

export default class QueryData<T>
{
    private static instanceID = 0;

    //@ts-ignore
    private id          : number = ++QueryData.instanceID;
    private timeout     : ReturnType<typeof setTimeout> | undefined; // TODO use timer lib instead
    private version     : number = 0;
    private lastFetch   : { fetchedAt: number, promise: Promise<void> } | undefined;
    private query       : QueryFn<T>;
    private events      = { updatedAt: 0, expiredAt: 0 };
    private options     : 
    {
        staleTime   : number
        cacheTime   : number
        onRelease?  : () => void
    };

    public state        : State<QueryDataState<T>>;
    
    constructor( query: QueryFn<T>, options: QueryDataOptions = {})
    {
        this.options = { staleTime: options.staleTime ?? Infinity, cacheTime: options.cacheTime ?? 0, onRelease: options.onRelease };
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
        { cache: true });

        this.query = query;
    }

    public get updatedAt(){ return this.events.updatedAt }
    public get expiredAt(){ return this.events.expiredAt }

    public get isActive(){ return this.state.active }

    private scheduleInvalidate( staleTime: number = this.options.staleTime )
    {
        this.timeout && clearTimeout( this.timeout ); // TODO timer;

        if( staleTime !== Infinity )
        {
            this.timeout = setTimeout(() => this.invalidate({ silent: true }), staleTime * 1000 );
        }
        // TODO cacheTime
    }

    public get(): T | undefined
    {
        return this.state.get()!.data;
    }

    public use(): QueryDataState<T>
    {
        this.fetch();

        //TODO clear cache timeout

        return this.state.use()!;
    }

    public preset( value: T ): boolean
    {
        const state = this.state.get()!;

        if( state.data === undefined )
        {
            this.state.set(
            {
                data        : value,
                error       : undefined,
                isError     : false,
                isPreset    : true,
                isFetching  : false,
                set         : state.set,
                refetch     : state.refetch
            });
        }

        return ( state.data !== undefined );
    }

    public set( value: T, options: QueryDataOptions = {}): boolean
    {
        ++this.version;

        const state = this.state.get()!;

        this.lastFetch = undefined;
        this.events.updatedAt = Date.now();
        this.state.set(
        {
            data        : value,
            error       : undefined,
            isError     : false,
            isPreset    : false,
            isFetching  : false,
            set         : state.set,
            refetch     : state.refetch
        });

        this.scheduleInvalidate( options.staleTime );

        return true;
    }

    public patch( update: Partial<T> ): boolean
    {
        const state = this.state.get()!;

        if( state.data !== undefined )
        {
            ++this.version;

            this.state.set(
            {
                data        : { ...state.data, ...update },
                error       : state.error,
                isError     : state.isError,
                isPreset    : state.isPreset,
                isFetching  : state.isFetching,
                set         : state.set,
                refetch     : state.refetch
            });

            // TODO force additional refetch if one is in progress
        }

        return ( state.data !== undefined );
    }

    public unset(): boolean
    {
        ++this.version;

        const state = this.state.get()!;

        this.lastFetch = undefined;
        this.events.updatedAt = 0;
        this.state.set(
        {
            data        : undefined,
            error       : undefined,
            isError     : false,
            isPreset    : false,
            isFetching  : false,
            set         : state.set,
            refetch     : state.refetch
        });
        
        this.scheduleInvalidate( Infinity );

        return true;
    }

    public async invalidate( options: QueryInvalidateOptions = {}): Promise<void>
    {
        (( 'unset' in options && options.unset ) || !this.state.active ) && this.unset();

        this.events.expiredAt = Date.now();

        if( this.state.active )
        {
            // TODO spravne options
            await this.fetch();
        }
        else
        {
            this.timeout && clearTimeout( this.timeout );
        }
    }

    public async refetch( options: QueryRefetchOptions = {}): Promise<void>
    {
        return this.fetch( options );
    }
    
    private async fetch( options: QueryFetchOptions = {}): Promise<void>
    {
        if( this.lastFetch && Date.now() - this.lastFetch.fetchedAt < MAX_FETCH_INTERVAL ){ return this.lastFetch.promise }

        this.lastFetch = 
        {
            fetchedAt: Date.now(),
            promise: new Promise<void>( async ( resolve, reject ) =>
            {
                const state = this.state.get()!;

                // TODO toto poprehadzovat na zaciatok pred promise ze vieme aj lastfetch vratit ked treba
                if( options.force !== false && ( !state.isFetching && ( state.isPreset || state.data === undefined )))
                {
                    if( this.timeout ){ clearTimeout( this.timeout )}

                    try
                    {
                        let version = ++this.version, data = this.query();

                        if( data instanceof Promise )
                        {
                            !options.silent && this.state.set(
                            {
                                data        : state.data,
                                error       : state.error,
                                isError     : state.isError,
                                isPreset    : state.isPreset,
                                isFetching  : true,
                                set         : state.set,
                                refetch     : state.refetch
                            });

                            data = await data;

                            if( version !== this.version )
                            {
                                return this.lastFetch ? this.lastFetch.promise.then( resolve ).catch( reject ) : resolve();
                            }
                        }

                        this.state.set(
                        {
                            data        : data,
                            error       : undefined,
                            isError     : false,
                            isPreset    : false,
                            isFetching  : false,
                            set         : state.set,
                            refetch     : state.refetch
                        });

                        this.scheduleInvalidate();
                    }
                    catch( e )
                    {
                        //TODO retries OR sucessfull fetch in between

                        this.state.set(
                        {
                            data        : state.data,
                            error       : undefined,
                            isError     : false,
                            isPreset    : false,
                            isFetching  : false,
                            set         : state.set,
                            refetch     : state.refetch
                        });

                        this.scheduleInvalidate( 2 );
                    }
                }

                resolve();
            })
        }

        await this.lastFetch.promise;
    }
}