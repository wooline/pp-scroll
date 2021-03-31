/* eslint-disable no-nested-ternary */
import React, {ReactNode, RefObject, PureComponent} from 'react';
import {ScrollView, View} from '@tarojs/components';
import Tools from './tools';

export interface DataSource<T = any> {
  sid: number;
  list: T[];
  page: [number, number] | number;
  totalPages: number;
  scrollTop?: number;
  firstSize?: number;
}
interface Props<T = any> {
  className?: string;
  datasource: DataSource<T>;
  onTurning: (page: [number, number] | number, sid: number) => void;
  onUnmount: (page: [number, number] | number, scrollTop: number) => void;
  children: (list: T[]) => ReactNode;
  tools?: (curPage: [number, number] | number, totalPages: number, show: boolean, loading: boolean, onTurning: (page?: number) => void) => ReactNode;
  topArea?: (morePage: boolean, prevPage: number, loading: boolean) => ReactNode;
  bottomArea?: (morePage: boolean, nextPage: number, loading: boolean) => ReactNode;
}
interface State<T = any> extends Required<DataSource<T>> {
  datasource: DataSource<T> | null;
  cacheDatasource: DataSource<T> | null;
  sourceCache: {[page: number]: DataSource<T>};
  lockState: State<T> | null;
  actionState: '' | 'next' | 'prev' | 'prev-reclaiming' | 'next-reclaiming';
  scrollState: '' | 'up' | 'down';
  loadingState: boolean;
  showTools: boolean;
}
interface MemoCache {
  result?: any;
  depes?: any[];
}

const defaultTopArea = (morePage: boolean, prevPage: number, loading: boolean) => {
  return morePage && <View className={`ppscroll-tips ${loading ? ' loading' : ''}`}>Loading</View>;
};

const defaultBottomArea = (morePage: boolean, nextPage: number, loading: boolean) => {
  return morePage ? <View className={`ppscroll-tips ${loading ? ' loading' : ''}`}>Loading</View> : <View className="ppscroll-tips">NO MORE</View>;
};

class Component<T> extends PureComponent<Props<T>, State<T>> {
  static getDerivedStateFromProps(nextProps: Props, prevState: State): Partial<State> | null {
    const newState: Partial<State> = {};
    let datasource: DataSource | null = null;
    if (nextProps.datasource !== prevState.datasource) {
      newState.datasource = nextProps.datasource;
      datasource = nextProps.datasource;
    }
    if (prevState.cacheDatasource) {
      newState.cacheDatasource = null;
      datasource = prevState.cacheDatasource;
    }
    if (datasource) {
      if (datasource.sid > prevState.sid) {
        const sourceCache = {};
        if (typeof datasource.page === 'number') {
          sourceCache[datasource.page] = datasource;
          newState.scrollTop = datasource.scrollTop || (datasource.page === 1 ? 0 : datasource.page === datasource.totalPages ? 999999 : 200);
        } else {
          const [firstPage, secondPage] = datasource.page;
          const firstList = datasource.list.slice(0, datasource.firstSize);
          const secondList = datasource.list.slice(datasource.firstSize);
          sourceCache[firstPage] = {sid: 0, list: firstList, page: firstPage};
          sourceCache[secondPage] = {sid: 0, list: secondList, page: secondPage};
        }
        Object.assign(newState, {
          sourceCache,
          lockState: null,
          actionState: '',
          scrollState: '',
          loadingState: false,
          showTools: false,
          sid: datasource.sid,
          list: datasource.list,
          page: datasource.page,
          totalPages: datasource.totalPages,
          firstSize: datasource.firstSize || 0,
        });
        if (prevState.scrollTop === newState.scrollTop) {
          newState.scrollTop += 1;
        }
      } else if (datasource.sid === prevState.sid) {
        const {list: curList, page, scrollState, sourceCache} = prevState;
        const curPage = typeof page === 'number' ? page : 0;
        if (curPage && (datasource.page === curPage - 1 || datasource.page === curPage + 1)) {
          if (!sourceCache[datasource.page]) {
            sourceCache[datasource.page] = datasource;
          }
          let lockState: Partial<State>;
          if (datasource.page === curPage - 1) {
            lockState = {
              lockState: null,
              actionState: 'prev-reclaiming',
              scrollState: '',
              loadingState: false,
              list: [...datasource.list, ...curList],
              page: [datasource.page, curPage],
              firstSize: datasource.list.length,
            };
          } else {
            lockState = {
              lockState: null,
              actionState: 'next-reclaiming',
              scrollState: '',
              loadingState: false,
              list: [...curList, ...datasource.list],
              page: [curPage, datasource.page],
              firstSize: curList.length,
            };
          }
          if (scrollState === '') {
            Object.assign(newState, lockState);
          } else {
            Object.assign(newState, {lockState});
          }
        }
      }
    }
    return Object.keys(newState).length > 0 ? newState : null;
  }

  state: State = {
    datasource: null,
    cacheDatasource: null,
    sourceCache: {},
    lockState: null,
    actionState: '',
    scrollState: '',
    loadingState: false,
    showTools: false,
    sid: -1,
    list: [],
    page: 0,
    totalPages: 0,
    scrollTop: 0,
    firstSize: 0,
  };

  listRef: RefObject<any>;

  curScrollTop: number = 0;

  prevScrollTop: number = 0;

  scrollTimer: number = 0;

  toolsTimer: number = 0;

  reclaiming?: () => void;

  listData: T[] = [];

  listComponentCache: MemoCache = {};

  prevPageNum: [number, number] | number = 0;

  constructor(props: any) {
    super(props);
    this.listRef = React.createRef();
  }

  // 回收视口上方的项目会自动调整scrollTop
  // getSnapshotBeforeUpdate(prevProps: Props, prevState: State) {
  //   const curActionState = this.state.actionState;
  //   const prevActionState = prevState.actionState;
  //   if ((curActionState === 'next' && prevActionState === '') || (curActionState === '' && prevActionState === 'prev')) {
  //     const list = this.listRef.current;
  //     return [list.scrollHeight, list.scrollTop];
  //   }
  //   return null;
  // }

  // 回收视口上方的项目会自动调整scrollTop
  // componentDidUpdate(prevProps: Props, prevState: State, snapshot: [number, number]) {
  //   const curActionState = this.state.actionState;
  //   const prevActionState = prevState.actionState;
  //   if (snapshot) {
  //     const [prevScrollHeight, prevScrollTop] = snapshot;
  //     const ul = this.listRef.current;
  //     if (curActionState === 'next') {
  //       // ul.scrollTop = prevScrollTop - (prevScrollHeight - ul.scrollHeight);
  //     } else if (prevActionState === 'prev') {
  //       ul.scrollTop = prevScrollTop + (ul.scrollHeight - prevScrollHeight);
  //     }
  //   }
  // }

  getSnapshotBeforeUpdate(prevProps: Props, prevState: State) {
    const curActionState = this.state.actionState;
    const prevActionState = prevState.actionState;
    if (
      (curActionState === 'next-reclaiming' && prevActionState === 'next') ||
      (curActionState === 'prev-reclaiming' && prevActionState === 'prev')
    ) {
      const list = this.listRef.current;
      return [list.scrollTop, list.scrollHeight];
    }

    return null;
  }

  componentDidUpdate(prevProps: Props, prevState: State, snapshot: [number, number]) {
    const reclaiming = this.reclaiming;
    const list = this.listRef.current;
    if (reclaiming) {
      this.reclaiming = undefined;
      reclaiming();
    } else {
      const curActionState = this.state.actionState;
      const prevActionState = prevState.actionState;
      if (curActionState === 'next-reclaiming' && prevActionState === 'next') {
        setTimeout(() => this.setState({actionState: ''}), 0);
      } else if (curActionState === 'prev-reclaiming' && prevActionState === 'prev') {
        // 如果慢速滚动，浏览器会根据内容变动自动重算list.scrollTop，所以不能使用list.scrollTop+；
        const [prevScrollTop, prevScrollHeight] = snapshot;
        const scrollTop = prevScrollTop + (list.scrollHeight - prevScrollHeight);
        list.scrollTop = scrollTop;
        setTimeout(() => this.setState({actionState: ''}), 0);
      }
    }
  }

  componentWillUnmount() {
    this.props.onUnmount(this.state.page, this.curScrollTop);
  }

  onScrollToLower = () => {
    const {actionState, page, list, firstSize, sourceCache, totalPages} = this.state;
    if (actionState === '' || actionState === 'prev') {
      const secondPage = typeof page === 'object' ? page[1] : page;
      const secondList = typeof page === 'object' ? list.slice(firstSize) : list;
      if (secondPage < totalPages) {
        const sid = Date.now();
        const newState: Partial<State> = {
          sid,
          actionState: 'next',
          lockState: null,
        };
        const nextPage = secondPage + 1;
        let cacheDatasource = sourceCache[nextPage];
        if (cacheDatasource) {
          cacheDatasource = {...cacheDatasource, sid};
        }
        if (actionState === '') {
          Object.assign(newState, {list: secondList, page: secondPage});
          if (cacheDatasource) {
            this.reclaiming = () => this.setState({cacheDatasource});
          } else {
            this.reclaiming = () => this.onTurning(nextPage, sid);
          }
        } else if (cacheDatasource) {
          Object.assign(newState, {cacheDatasource});
        } else {
          this.onTurning(nextPage, sid);
        }
        this.setState(newState as State);
      }
    }
  };

  onScrollToUpper = () => {
    const {actionState, page, list, firstSize, sourceCache} = this.state;
    if (actionState === '' || actionState === 'next') {
      const firstPage = typeof page === 'object' ? page[0] : page;
      const firstList = typeof page === 'object' ? list.slice(0, firstSize) : list;
      if (firstPage > 1) {
        const sid = Date.now();
        const newState: Partial<State> = {
          sid,
          actionState: 'prev',
          lockState: null,
        };
        const prevPage = firstPage - 1;
        let cacheDatasource = sourceCache[prevPage];
        if (cacheDatasource) {
          cacheDatasource = {...cacheDatasource, sid};
        }
        if (actionState === '') {
          Object.assign(newState, {list: firstList, page: firstPage});
          if (cacheDatasource) {
            this.reclaiming = () => this.setState({cacheDatasource});
          } else {
            this.reclaiming = () => this.onTurning(prevPage, sid);
          }
        } else if (cacheDatasource) {
          Object.assign(newState, {cacheDatasource});
        } else {
          this.onTurning(prevPage, sid);
        }
        this.setState(newState as State);
      }
    }
  };

  checkScroll = () => {
    const lockState = this.state.lockState;
    const prevScrollTop = this.prevScrollTop;
    const curScrollTop = this.curScrollTop;
    const n = curScrollTop - prevScrollTop;
    const scrollState = n > 0 ? 'down' : n < 0 ? 'up' : '';
    if (this.state.scrollState !== scrollState) {
      if (scrollState === '' && lockState) {
        this.setState(lockState as State);
      } else {
        this.setState({scrollState});
      }
    }
    if (n === 0) {
      this.scrollTimer = 0;
    } else {
      this.prevScrollTop = curScrollTop;
      this.scrollTimer = setTimeout(this.checkScroll, 300);
    }
  };

  onScroll = (e: any) => {
    this.curScrollTop = e.detail.scrollTop;
    if (!this.scrollTimer) {
      this.checkScroll();
    }
  };

  onTurning = (page: [number, number] | number, sid: number) => {
    this.setState({loadingState: true});
    this.props.onTurning(page, sid);
  };

  onToolsTurning = (page?: number) => {
    if (!page) {
      this.onTurning(this.state.page, Date.now());
    } else if (page < 0) {
      this.onTurning(this.state.totalPages, Date.now());
    } else {
      this.onTurning(page, Date.now());
    }
  };

  defaultTools = (curPage: [number, number] | number, totalPages: number, show: boolean, loading: boolean, onTurning: (page?: number) => void) => {
    return <Tools curPage={curPage} totalPages={totalPages} show={show} onTurning={onTurning} loading={loading} className={this.props.className} />;
  };

  useMemo<C>(cache: {result?: C; depes?: any[]}, callback: () => C, depes: any[] = []) {
    if (!cache.result || depes.some((val, index) => val !== cache.depes![index])) {
      cache.result = callback();
    }
    cache.depes = depes;
    return cache.result;
  }

  switchTools(showTools: boolean) {
    if (this.toolsTimer) {
      clearTimeout(this.toolsTimer);
    }
    this.toolsTimer = setTimeout(
      () => {
        this.setState({showTools});
        this.toolsTimer = 0;
      },
      showTools ? 300 : 1200
    );
  }

  render() {
    const {className = 'g-scroll-view', children, tools = this.defaultTools, topArea = defaultTopArea, bottomArea = defaultBottomArea} = this.props;
    const {page, list, scrollTop, actionState, scrollState, totalPages, loadingState, showTools} = this.state;
    const [firstPage, secondPage] = typeof page === 'object' ? page : [page, page];
    const listComponent = this.useMemo(this.listComponentCache, () => children(list || []), [list]);
    if (actionState === '') {
      this.prevPageNum = page;
    }
    this.switchTools(!!scrollState || loadingState);
    return (
      <>
        {tools(this.prevPageNum, totalPages, showTools, loadingState, this.onToolsTurning)}
        <ScrollView
          ref={this.listRef}
          className={`ppscroll ${className} ${loadingState ? 'loading' : ''}`}
          scrollY
          scrollTop={scrollTop}
          onScroll={this.onScroll}
          onScrollToLower={this.onScrollToLower}
          onScrollToUpper={this.onScrollToUpper}
          upperThreshold={100}
          lowerThreshold={100}
        >
          <View>
            {topArea(firstPage > 1, firstPage - 1, actionState === 'prev' || actionState === 'prev-reclaiming')}
            {listComponent}
            {bottomArea(secondPage < totalPages, secondPage + 1, actionState === 'next' || actionState === 'next-reclaiming')}
          </View>
        </ScrollView>
      </>
    );
  }
}

export default Component;
