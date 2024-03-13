import { State } from '@liqd-rn/state';
import { QueryCacheEntry, QueryCacheValue, QueryState } from './types';

export default class Query<T>
{
    private cached: QueryCacheEntry<undefined, T>;

    public constructor()
    {
        const value = { fetching: false, data: undefined, refetch: () => { this.refetch()}};

        this.cached =
        {
            params: undefined,
            value,
            preset: false,
            state: new State<QueryCacheValue<T>>({ ...value }, { cache: true }),
            fetchID: 0
        };
    }

    private reset()
    {
        this.cached.preset = this.cached.value.fetching = false;
        this.cached.value.data = undefined;
        this.cached.state.set({ ...this.cached.value });
    }

    private fetch( force: boolean = false ): void
    {
        if( force || ( !this.cached.value.fetching && ( this.cached.preset || this.cached.value.data === undefined )))
        {
            const query = this.query();

            if( query instanceof Promise )
            {
                const fetchID = ++this.cached.fetchID;
                this.cached.value.fetching = true;
                this.cached.state.set({ ...this.cached.value });

                query.then( data => 
                {
                    if( fetchID === this.cached.fetchID )
                    {
                        this.cached.preset = this.cached.value.fetching = false;
                        this.cached.value.data = data;
                        this.cached.state.set({ ...this.cached.value });
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
                this.cached.preset = this.cached.value.fetching = false;
                this.cached.value.data = query;
                this.cached.state.set({ ...this.cached.value });
            }
        }
    }

    public get(): T | undefined
    {
        return this.cached.value.data;
    }

    public set( data: T ): typeof this
    {
        this.cached.fetchID++;
        this.cached.value.fetching = false;
        this.cached.value.data = data;
        this.cached.state.set({ ...this.cached.value });

        return this;
    }

    public preset( data: T ): typeof this
    {
        if( this.cached.preset || this.cached.value.data === undefined )
        {
            this.cached.preset = true;
            this.cached.value.data = data;
            this.cached.state.set({ ...this.cached.value });
        }

        return this;   
    }

    public unset(): typeof this
    {
        this.reset();

        return this;
    }

    public use(): QueryState<T>
    {
        this.fetch();

        //return this.cached.value; // TODO uncomment
        return this.cached.state.use()!;
    }

    public refetch(): typeof this
    {
        this.cached.state.active ? this.fetch( true ) : this.reset();

        return this;   
    }

    protected query(): Promise<T | undefined> | T | undefined
    {
        throw new Error('Not implemented');
    }
}