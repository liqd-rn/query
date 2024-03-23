import Query, { defineQuery } from './query';
import ParamQuery, { defineParamQuery } from './paramquery';
import InfiniteQuery, { defineInfiniteQuery} from './infinitequery';
import { InfiniteQueryPage, InfiniteQueryResult } from './types';

export { InfiniteQueryPage, InfiniteQueryResult };
export { Query, ParamQuery, InfiniteQuery };
export { defineQuery, defineParamQuery, defineInfiniteQuery };