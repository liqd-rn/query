export type QueryFn<T> = () => Promise<T | undefined> | T | undefined;

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

export type QueryParamsFilter<QueryParams> = ( params: QueryParams ) => boolean;