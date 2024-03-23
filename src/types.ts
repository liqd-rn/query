export type InfiniteQueryPage<P> = { param: P, direction?: 'next' | 'prev' };
export type InfiniteQueryResult<T,P> = Promise<{ data: T[], nextPage?: P, prevPage?: P } | undefined> | { data: T[], nextPage?: P, prevPage?: P } | undefined;

export type QueryFn<T> = () => Promise<T | undefined> | T | undefined;
export type InfiniteQueryFn<T,P> = ( page?: InfiniteQueryPage<P> ) => InfiniteQueryResult<T,P>

export type QueryInvalidateOptions = (
{
    unset       : true
}
|
{
    silent?     : true
    soft?       : true
})

export type QueryRefetchOptions = 
{
    silent?     : true
};

export type InfiniteQueryFetchPageOptions =
{
    direction   : 'next' | 'prev'
    silent?     : true
}

export type QueryDataOptions =
{
    staleTime?  : number
    cacheTime?  : number
    onRelease?  : () => void
}

export type QueryDataState<T> = 
{
    data        : T | undefined
    error       : Error | undefined
    isError     : boolean
    isPreset    : boolean
    isFetching  : boolean
    set         : ( value: T ) => void
    refetch     : () => void
}

export type InfiniteQueryDataState<T> = Omit<QueryDataState<T[]>, 'set'> &
{
    hasNextPage         : boolean
    isFetchingNextPage  : boolean
    fetchNextPage       : () => void
}

export type QueryParamsFilter<QueryParams> = ( params: QueryParams ) => boolean;