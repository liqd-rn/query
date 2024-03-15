import { QueryDataState } from './types';
import QueryData from './data';

export default class Query<T>
{
    private data: QueryData<T>;

    public constructor()
    {
        this.data = new QueryData<T>(() => this.query());
    }

    public get(): T | undefined
    {
        return this.data.get();
    }

    public use(): QueryDataState<T>
    {
        return this.data.use();
    }

    public preset( data: T ): typeof this
    {
        this.data.preset( data );

        return this;   
    }

    public set( data: T ): typeof this
    {
        this.data.set( data );

        return this;
    }

    public refetch(): typeof this
    {
        this.data.fetch( true );

        return this;   
    }

    protected query(): Promise<T | undefined> | T | undefined
    {
        throw new Error('Not implemented');
    }
}