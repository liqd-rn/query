import { State } from '@liqd-rn/state';
import { objectStringify } from '@liqd-js/fast-object-hash';
import { QueryCacheEntry, QueryCacheValue, QueryParamsFilter, QueryState } from './types';

export default class ParamQuery<QueryParams, T>
{
    private cache = new Map<string, QueryCacheEntry<QueryParams, T>>();

    public constructor()
    {

    }

    private key( params: QueryParams ): string
    {
        return objectStringify( params, { sortArrays: true, ignoreUndefinedProperties: true });
    }

    //TODO verify
    //private cached( params: QueryParams, create?: undefined ): QueryCacheEntry<QueryParams, T> | undefined
    //private cached( params: QueryParams, create?: true ): QueryCacheEntry<QueryParams, T>
    private cached( params: QueryParams, create?: boolean ): QueryCacheEntry<QueryParams, T> | undefined
    {
        let key = this.key( params ), cached = this.cache.get( key );

        if( !cached && create )
        {
            const value = { fetching: false, data: undefined, refetch: () => { this.refetch( params )}};

            this.cache.set( key, cached = 
            {
                params,
                value,
                preset  : false, 
                state   : new State<QueryCacheValue<T>>({ ...value }, { cache: true }),
                fetchID : 0
            });
        }

        return cached;
    }

    private reset( cached: QueryCacheEntry<QueryParams, T> )
    {
        cached.preset = cached.value.fetching = false;
        cached.value.data = undefined;
        cached.state.set({ ...cached.value });
    }

    private fetch( cached: QueryCacheEntry<QueryParams, T>, force: boolean = false ): void
    {
        if( force || ( !cached.value.fetching && ( cached.preset || cached.value.data === undefined )))
        {
            const query = this.query( cached.params );

            if( query instanceof Promise )
            {
                const fetchID = ++cached.fetchID;
                cached.value.fetching = true;
                cached.state.set({ ...cached.value });

                query.then( data => 
                {
                    if( fetchID === cached.fetchID )
                    {
                        cached.preset = cached.value.fetching = false;
                        cached.value.data = data;
                        cached.state.set({ ...cached.value });
                    }
                })
                .catch( error =>
                {
                    error;
                    //TODO
                });
            }
            else
            {
                cached.preset = cached.value.fetching = false;
                cached.value.data = query;
                cached.state.set({ ...cached.value });
            }
        }
    }

    public get( params: QueryParams ): T | undefined
    {
        return this.cached( params )?.value.data;
    }

    public set( params: QueryParams, data: T ): typeof this
    {
        const cached = this.cached( params, true )!;
        
        cached.fetchID++;
        cached.value.fetching = false;
        cached.value.data = data;
        cached.state.set({ ...cached.value });

        return this;
    }

    public preset( params: QueryParams, data: T ): typeof this
    {
        const cached = this.cached( params, true )!;

        if( cached.preset || cached.value.data === undefined )
        {
            cached.preset = true;
            cached.value.data = data;
            cached.state.set({ ...cached.value });
        }

        return this;   
    }

    public unset( params: QueryParams ): typeof this
    {
        const cached = this.cached( params );

        cached && this.reset( cached );

        return this;
    }

    public use( params: QueryParams ): QueryState<T>
    {
        const cached = this.cached( params, true )!;

        this.fetch( cached );

        //return cached.value; // TODO uncomment
        return cached.state.use()!;
    }

    public refetch( params: QueryParams | QueryParamsFilter<QueryParams> ): typeof this
    {
        if( typeof params === 'function' )
        {
            Object.values( this.cache ).filter( c => ( params as Function )( c.params )).forEach( c => this.refetch( c.params ));
        }
        else
        {
            const cached = this.cached( params );

            if( cached )
            {
                cached.state.active ? this.fetch( cached, true ) : this.reset( cached );
            }
        }

        return this;   
    }

    public refetchAll(): typeof this
    {
        Object.values( this.cache ).forEach( c => this.refetch( c.params ));

        return this;
    }

    protected query( _: QueryParams ): Promise<T | undefined> | T | undefined
    {
        throw new Error('Not implemented');
    }
}