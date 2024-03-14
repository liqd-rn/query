export type QueryFn<T> = () => Promise<T | undefined> | T | undefined;

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