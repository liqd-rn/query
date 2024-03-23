import { InfiniteQueryDataState, InfiniteQueryPage, InfiniteQueryResult, QueryDataOptions, QueryInvalidateOptions, QueryRefetchOptions } from './types';
import InfiniteQueryData from './infinitedata';

export default class InfiniteQuery<T,P=any>
{
    private data: InfiniteQueryData<T,P>;

    public constructor( options: QueryDataOptions = {})
    {
        this.data = new InfiniteQueryData<T,P>(( page?: InfiniteQueryPage<P> ) => this.query( page ), options );
    }

    public get(): T[] | undefined
    {
        return this.data.get();
    }

    public use(): InfiniteQueryDataState<T>
    {
        return this.data.use();
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

    protected query( page?: InfiniteQueryPage<P> ): InfiniteQueryResult<T,P>
    {
        throw new Error( 'Not implemented' + page?.toString() );
    }
}