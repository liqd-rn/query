import Query, { defineQuery } from './query';
import ParamQuery, { defineParamQuery } from './paramquery';
import InfiniteQuery, { defineInfiniteQuery} from './infinitequery';
import InfiniteParamQuery, { defineInfiniteParamQuery } from './infiniteparamquery';
import { InfiniteQueryPage, InfiniteQueryResult } from './types';

export { InfiniteQueryPage, InfiniteQueryResult };
export { Query, ParamQuery, InfiniteQuery, InfiniteParamQuery };
export { defineQuery, defineParamQuery, defineInfiniteQuery, defineInfiniteParamQuery };