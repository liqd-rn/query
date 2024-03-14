import { objectStringify } from '@liqd-js/fast-object-hash';
import { QueryDataState, QueryParamsFilter } from './types';
import QueryData from './data';

export default class ParamQuery<QueryParams, T>
{
    private index = new Map<string, { params: QueryParams, data: QueryData<T>}>();

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
    private data( params: QueryParams, create?: boolean ): QueryData<T> | undefined
    {
        let key = this.key( params ), entry = this.index.get( key );

        if( !entry && create )
        {
            this.index.set( key, entry = 
            {
                params,
                data: new QueryData<T>(() => this.query( params ))
            });
        }

        return entry?.data;
    }

    public get( params: QueryParams ): T | undefined
    {
        return this.data( params )?.get();
    }

    public use( params: QueryParams ): QueryDataState<T>
    {
        return this.data( params, true )!.use();
    }

    public preset( params: QueryParams, data: T ): typeof this
    {
        this.data( params, true )?.set( data );

        return this;   
    }

    public set( params: QueryParams, data: T ): typeof this
    {
        this.data( params, true )?.set( data );

        return this;
    }

    public refetch( params: QueryParams | QueryParamsFilter<QueryParams> ): typeof this
    {
        if( typeof params === 'function' )
        {
            Object.values( this.index ).filter( i => ( params as Function )( i.params )).forEach( i => i.data.refetch( true ));
        }
        else
        {
            const data = this.data( params );

            if( data )
            {
                data.isActive? data.refetch( true ) : data.unset();
            }
        }

        return this;   
    }

    public refetchAll(): typeof this
    {
        Object.values( this.index ).forEach( i => i.data.isActive? i.data.refetch( true ) : i.data.unset() );

        return this;
    }

    protected query( _: QueryParams ): Promise<T | undefined> | T | undefined
    {
        throw new Error('Not implemented');
    }
}