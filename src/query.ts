import { QueryDataOptions, QueryDataState, QueryInvalidateOptions, QueryRefetchOptions } from './types';
import QueryData from './data';

export default class Query<T>
{
    private data: QueryData<T>;

    public constructor( options: QueryDataOptions = {})
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
        throw new Error('Not implemented');
    }
}