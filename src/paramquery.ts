import { useCallback, useEffect, useState } from 'react';
import { objectStringify } from '@liqd-js/fast-object-hash';
import { useNested, QueryDataOptions, QueryDataState, QueryInvalidateOptions, QueryParamsFilter, QueryRefetchOptions } from './types';
import QueryData from './data';

export default class ParamQuery<QueryParams, T>
{
    private index = new Map<string, { params: QueryParams, data: QueryData<T>}>();
    
    public constructor( private options: Omit<QueryDataOptions, 'onRelease'> = {}, private queryFn: ( params: QueryParams ) => Promise<T | undefined> | T | undefined )
    {
        
    }

    private key( params: QueryParams ): string
    {
        return objectStringify( params, { sortArrays: true, ignoreUndefinedProperties: true });
    }

    //TODO verify
    //private cached( params: QueryParams, create?: undefined ): QueryCacheEntry<QueryParams, T> | undefined
    //private cached( params: QueryParams, create?: true ): QueryCacheEntry<QueryParams, T>
    private data( params: QueryParams, create: boolean = false ): QueryData<T> | undefined
    {
        let key = this.key( params ), entry = this.index.get( key );

        if( !entry && create )
        {
            this.index.set( key, entry = 
            {
                params,
                data: new QueryData<T>
                (
                    () => this.query( params ),
                    {
                        ...this.options,
                        onRelease: () => this.index.delete( key )
                    }
                )
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
        const [ state, setState ] = useState<{value: QueryDataState<T>}>({ value: this.data( params, true )![useNested]() });

        const handler = useCallback(( value: QueryDataState<T> | undefined ) => setState({ value: value! }), []);

        useEffect(() => 
        {
            const data = this.data( params, true )!;

            data.state.on( 'update', handler );

            return () => { data.state.off( 'update', handler )}
        },
        []);

        useEffect(() => 
        {
            const data = this.data( params, true )!;
            
            setState({ value: data[useNested]() });

            data.state.on( 'update', handler );

            return () => { data.state.off( 'update', handler )}
        },
        [ this.key( params )]);
        
        return state.value;
    }

    public preset( params: QueryParams, data: T ): boolean
    {
        return this.data( params, true )?.preset( data ) ?? false;
    }

    public set( params: QueryParams, data: T ): boolean
    {
        return this.data( params, true )?.set( data ) ?? false;
    }

    public patch( params: QueryParams, data: Partial<T> ): boolean
    {
        return this.data( params )?.patch( data ) ?? false;
    }

    public unset( params: QueryParams ): boolean
    {
        return this.data( params )?.unset() || true;
    }

    private each<R>( params: QueryParams | QueryParamsFilter<QueryParams> | undefined, callback: ({ key, data }: { key: string, data: QueryData<T> }) => R ): R[]
    {
        if( params === undefined || typeof params === 'function' )
        {
            return Object.entries( this.index )
                .filter(([ _, entry ]) => params === undefined ? true : ( params as Function )( entry.params ))
                .map(([ key, entry ]) => callback({ key, data: entry.data }));
        }
        else
        {
            const key = this.key( params ), entry = this.index.get( key );

            return entry ? [ callback({ key, data: entry.data })] : [];
        }
    }

    public async invalidate( params: QueryParams | QueryParamsFilter<QueryParams>, options: QueryInvalidateOptions = {}): Promise<void>
    {
        await Promise.all( this.each( params, ({ data }) => data.invalidate( options )));
    }

    public async invalidateAll( options: QueryInvalidateOptions = {}): Promise<void>
    {
        await Promise.all( this.each( undefined, ({ data }) => data.invalidate( options )));
    }

    public async refetch( params: QueryParams | QueryParamsFilter<QueryParams>, options: QueryRefetchOptions = {}): Promise<void>
    {
        if( typeof params === 'function' )
        {
            await Promise.all( this.each( params, ({ data }) => data.refetch( options )));
        }
        else
        {
            await this.data( params, true )?.refetch( options );
        }
    }

    public async refetchAll(): Promise<void>
    {
        await Promise.all( this.each( undefined, ({ data }) => data.refetch()));
    }

    protected query( params: QueryParams ): Promise<T | undefined> | T | undefined
    {
        if( !this.queryFn ){ throw new Error('Not implemented '  + params?.toString() )}

        return this.queryFn( params );
    }
}

export function defineParamQuery<QueryParams, T>( definition: Omit<QueryDataOptions, 'onRelease'> & { query: ( params: QueryParams ) => Promise<T | undefined> | T | undefined }): ParamQuery<QueryParams, T>
{
    const { query, ...options } = definition;

    return new ParamQuery<QueryParams, T>( options, query );
}