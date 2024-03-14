import { State } from '@liqd-rn/state';
import type { QueryFn, QueryDataState } from './types';

export default class QueryData<T>
{
    private version    : number
    public state       : State<QueryDataState<T>>
    public query       : QueryFn<T>
    
    constructor( query: QueryFn<T> )
    {
        this.version = 0;
        this.state = new State(
        {
            data        : undefined,
            error       : undefined,
            isError     : false,
            isPreset    : false,
            isFetching  : false,
            set         : this.set.bind( this ),
            refetch     : this.refetch.bind( this )
        },
        { cache: true });
        this.query = query;
    }

    public get isActive(): boolean
    {
        return this.state.active;
    }

    public get(): T | undefined
    {
        return this.state.get()!.data;
    }

    public use(): QueryDataState<T>
    {
        this.refetch();

        return this.state.use()!;
    }

    public preset( value: T ): void
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
    }

    public set( value: T ): void
    {
        ++this.version;

        const state = this.state.get()!;

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
    }

    public unset(): void
    {
        ++this.version;

        const state = this.state.get()!;

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
    }

    public async refetch( force: boolean = false ): Promise<void>
    {
        const state = this.state.get()!;

        if( force || ( !state.isFetching && ( state.isPreset || state.data === undefined )))
        {
            try
            {
                let version = ++this.version, data = this.query();

                if( data instanceof Promise )
                {
                    this.state.set(
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

                    if( version !== this.version ){ return }
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
            }
            catch( e )
            {
                //TODO
            }
        }
    }
}