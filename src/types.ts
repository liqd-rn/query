import { type State } from '@liqd-rn/state';

export type QueryCacheValue<T> = { fetching: boolean, data: T | undefined, refetch: () => void }

export type QueryCacheEntry<QueryParams, T> = 
{
    params      : QueryParams
    value       : QueryCacheValue<T>
    preset      : boolean
    state       : State<QueryCacheValue<T>>
    fetchID     : number
}

export type QueryState<T> = 
{
    fetching    : boolean
    data        : T | undefined
}

export type QueryParamsFilter<QueryParams> = ( params: QueryParams ) => boolean;