import { QueryDataOptions, QueryDataState, QueryInvalidateOptions, QueryRefetchOptions } from './types';
import QueryData from './data';

export default class Query<T>
{
    private data: QueryData<T>;

    public constructor( options: QueryDataOptions = {}, private queryFn?: () => Promise<T | undefined> | T | undefined )
    {
        this.data = new QueryData<T>(() => this.query(), options );
    }

    public get(): T | undefined
    {
        return this.data.get();
    }

    public use(): QueryDataState<T>
    {
        return this.data.use();
    }

    public preset( data: T ):boolean
    {
        return this.data.preset( data );
    }

    public set( data: T ): boolean
    {
        return this.data.set( data );
    }

    public patch( data: Partial<T> ): boolean
    {
        return this.data.patch( data );
    }

    public unset(): boolean
    {
        return this.data.unset();
    }

    public async invalidate( options: QueryInvalidateOptions = {}): Promise<void>
    {
        return this.data.invalidate( options );
    }

    public async refetch( options: QueryRefetchOptions = {}): Promise<void>
    {
        return this.data.refetch( options );
    }

    protected query(): Promise<T | undefined> | T | undefined
    {
        if( !this.queryFn ){ throw new Error('Not implemented' )}

        return this.queryFn();
    }
}

export function defineQuery<T>( definition: QueryDataOptions & { query: () => Promise<T | undefined> | T | undefined }): Query<T>
{
    const { query, ...options } = definition;

    return new Query<T>( options, query );
}