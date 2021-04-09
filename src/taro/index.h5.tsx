import React, {ReactNode, RefObject, PureComponent} from 'react';
import memoizeOne from 'memoize-one';
import {View, ScrollView} from '@tarojs/components';
import Tools from './Tools';

export interface Datasource<T = any> {
  sid: number;
  list: T[];
  page: [number, number] | number;
  totalPages: number;
  totalItems: number;
  scrollTop?: number;
  firstSize?: number;
  errorCode?: string;
}
interface Props<T = any> {
  className?: string;
  datasource: Datasource<T>;
  onTurning: (page: [number, number] | number, sid: number) => void;
  onScroll?: (scrollTop: number, direction: '' | 'up' | 'down', datasource: Datasource<T>) => void;
  onDatasourceChange?: (datasource: Datasource<T>, scrollTop: number) => void;
  children: (list: T[]) => ReactNode;
  tools?: (
    curPage: [number, number] | number,
    totalPages: number,
    totalItems: number,
    show: boolean,
    loading: boolean,
    onTurning: (page?: number) => void
  ) => ReactNode;
  topArea?: (morePage: boolean, prevPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode;
  bottomArea?: (morePage: boolean, nextPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode;
  timeout?: number;
}
interface State<T = any> extends Required<Datasource<T>> {
  datasource: Datasource<T> | null;
  cacheDatasource: Datasource<T> | null;
  sourceCache: {[page: number]: Datasource<T>};
  lockState: State<T> | null;
  actionState: '' | 'next' | 'prev' | 'prev-reclaiming' | 'next-reclaiming';
  loadingState: number;
  errorCode: string;
  showTools: boolean;
}

const defaultTopArea = (morePage: boolean, prevPage: number, loading: boolean, errorCode: string, retry: () => void) => {
  if (morePage) {
    if (errorCode) {
      return (
        <View className="ppscroll-tips error" onClick={retry}>
          出错了，点击重试
        </View>
      );
    }
    return <View className={`ppscroll-tips ${loading ? ' loading' : ''}`}>Loading</View>;
  }
  return null;
};

const defaultBottomArea = (morePage: boolean, nextPage: number, loading: boolean, errorCode: string, retry: () => void) => {
  if (morePage) {
    if (errorCode) {
      return (
        <View className="ppscroll-tips error" onClick={retry}>
          出错了，点击重试
        </View>
      );
    }
    return <View className={`ppscroll-tips ${loading ? ' loading' : ''}`}>Loading</View>;
  }
  return <View className="ppscroll-tips">没有更多</View>;
};

const isIE = !!window['ActiveXObject'] || 'ActiveXObject' in window;
class Component<T> extends PureComponent<Props<T>, State<T>> {
  static getDerivedStateFromProps(nextProps: Props, prevState: State): Partial<State> | null {
    const newState: Partial<State> = {};
    let datasource: Datasource | null = null;
    if (nextProps.datasource !== prevState.datasource) {
      newState.datasource = nextProps.datasource;
      datasource = nextProps.datasource;
    }
    if (prevState.cacheDatasource) {
      newState.cacheDatasource = null;
      datasource = prevState.cacheDatasource;
    }
    if (datasource) {
      if (datasource.sid >= prevState.sid) {
        if (prevState.loadingState) {
          clearTimeout(prevState.loadingState);
        }
        if (datasource.errorCode) {
          Object.assign(newState, {
            lockState: null,
            actionState: '',
            loadingState: 0,
            errorCode: datasource.errorCode,
            showTools: false,
            sid: datasource.sid,
          });
          return newState;
        }
      }
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
          newState.scrollTop = datasource.scrollTop || 0;
        }
        Object.assign(newState, {
          sourceCache,
          lockState: null,
          actionState: '',
          loadingState: 0,
          errorCode: '',
          showTools: false,
          sid: datasource.sid,
          list: datasource.list,
          page: datasource.page,
          totalPages: datasource.totalPages,
          totalItems: datasource.totalItems,
          firstSize: datasource.firstSize || 0,
        });
        if (prevState.scrollTop === newState.scrollTop) {
          newState.scrollTop += 1;
        }
      } else if (datasource.sid === prevState.sid) {
        const {list: curList, page, sourceCache} = prevState;
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
              loadingState: 0,
              errorCode: '',
              list: [...datasource.list, ...curList],
              page: [datasource.page, curPage],
              firstSize: datasource.list.length,
            };
          } else {
            lockState = {
              lockState: null,
              actionState: 'next-reclaiming',
              loadingState: 0,
              errorCode: '',
              list: [...curList, ...datasource.list],
              page: [curPage, datasource.page],
              firstSize: curList.length,
            };
          }
          Object.assign(newState, {lockState});
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
    loadingState: 0,
    errorCode: '',
    showTools: false,
    sid: -1,
    list: [],
    page: 0,
    totalPages: 0,
    totalItems: 0,
    scrollTop: 0,
    firstSize: 0,
  };

  listRef: RefObject<any>;

  curScrollTop: number = 0;

  prevScrollTop: number = 0;

  scrollState: '' | 'up' | 'down' = '';

  scrollTimer: number = 0;

  toolsTimer: number = 0;

  reclaiming?: () => void;

  listData: T[] = [];

  prevPageNum: [number, number] | number = 0;

  curDatasource?: Datasource<T>;

  memoList = memoizeOne((render: (list: any) => ReactNode, list: any[]) => render(list || []));

  memoTools = memoizeOne(
    (
      render: (
        curPage: [number, number] | number,
        totalPages: number,
        totalItems: number,
        show: boolean,
        loading: boolean,
        onTurning: (page?: number) => void
      ) => ReactNode,
      curPage: [number, number] | number,
      totalPages: number,
      totalItems: number,
      show: boolean,
      loading: boolean,
      onTurning: (page?: number) => void
    ) => render(curPage, totalPages, totalItems, show, loading, onTurning)
  );

  memoTopArea = memoizeOne(
    (
      render: (morePage: boolean, prevPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode,
      morePage: boolean,
      prevPage: number,
      loading: boolean,
      errorCode: string,
      retry: () => void
    ) => render(morePage, prevPage, loading, errorCode, retry)
  );

  memoBottomArea = memoizeOne(
    (
      render: (morePage: boolean, nextPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode,
      morePage: boolean,
      nextPage: number,
      loading: boolean,
      errorCode: string,
      retry: () => void
    ) => render(morePage, nextPage, loading, errorCode, retry)
  );

  memoDatasource = memoizeOne(
    (
      callback: (datasource: Datasource<T>) => void,
      list: T[],
      page: [number, number] | number,
      totalPages: number,
      totalItems: number,
      firstSize?: number
    ) => {
      const datasource: Datasource<T> = {page, list, totalPages, totalItems, firstSize, sid: 0};
      callback(datasource);
      return datasource;
    }
  );

  memoShowTools = memoizeOne((switchTools: (show: boolean) => void, show: boolean) => switchTools(show));

  constructor(props: any) {
    super(props);
    this.listRef = React.createRef();
  }

  getSnapshotBeforeUpdate(prevProps: Props, prevState: State) {
    const curActionState = this.state.actionState;
    const prevActionState = prevState.actionState;
    if (
      (curActionState === 'next' && prevActionState === '' && isIE) ||
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
    const listRef = this.listRef.current;
    const curActionState = this.state.actionState;
    const lockState = this.state.lockState;
    if (reclaiming) {
      this.reclaiming = undefined;
      if (curActionState === 'next' && snapshot) {
        const [prevScrollTop, prevScrollHeight] = snapshot;
        listRef.scrollTop = prevScrollTop - (prevScrollHeight - listRef.scrollHeight);
      }
      this.curScrollTop = listRef.scrollTop;
      reclaiming();
    } else if (lockState) {
      if (this.scrollState === '') {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState(lockState);
      }
    } else {
      const prevActionState = prevState.actionState;
      if (curActionState === 'next-reclaiming' && prevActionState === 'next') {
        setTimeout(() => this.setState({actionState: ''}), 0);
      } else if (curActionState === 'prev-reclaiming' && prevActionState === 'prev') {
        // 如果慢速滚动，浏览器会根据内容变动自动重算listRef.scrollTop，所以不能使用listRef.scrollTop+；
        const [prevScrollTop, prevScrollHeight] = snapshot;
        const scrollTop = prevScrollTop + (listRef.scrollHeight - prevScrollHeight);
        listRef.scrollTop = scrollTop;
        this.curScrollTop = listRef.scrollTop;
        setTimeout(() => this.setState({actionState: ''}), 0);
      }
    }
    this.memoShowTools(this.switchTools, !!this.scrollState || !!this.state.loadingState);
    if (curActionState !== 'prev-reclaiming' && curActionState !== 'next-reclaiming') {
      if (this.state.scrollTop !== prevState.scrollTop) {
        this.curScrollTop = this.state.scrollTop;
      }
      const {page, list, firstSize, totalPages, totalItems} = this.state;
      this.curDatasource = this.memoDatasource(this.onDatasourceChange, list, page, totalPages, totalItems, firstSize);
    }
  }

  onScrollToLower = () => {
    const {actionState, page, list, firstSize, sourceCache, totalPages, errorCode} = this.state;
    if (!errorCode && (actionState === '' || actionState === 'prev')) {
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
    const {actionState, page, list, firstSize, sourceCache, errorCode} = this.state;
    if (!errorCode && (actionState === '' || actionState === 'next')) {
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
    const {lockState, loadingState, actionState} = this.state;
    const prevScrollTop = this.prevScrollTop;
    const curScrollTop = this.curScrollTop;
    const n = curScrollTop - prevScrollTop;
    const scrollState = n > 0 ? 'down' : n < 0 ? 'up' : '';
    if (this.scrollState !== scrollState) {
      this.scrollState = scrollState;
      this.memoShowTools(this.switchTools, !!scrollState || !!loadingState);
    }
    if (scrollState === '') {
      this.scrollTimer = 0;
      lockState && this.setState(lockState as State);
    } else {
      this.prevScrollTop = curScrollTop;
      this.scrollTimer = setTimeout(this.checkScroll, 300);
      this.onScrollTopChange(curScrollTop, scrollState);
    }
  };

  onScroll = (e: any) => {
    this.curScrollTop = e.detail.scrollTop;
    if (!this.scrollTimer) {
      this.checkScroll();
    }
  };

  onTurning = (page: [number, number] | number, sid: number) => {
    if (this.state.loadingState) {
      clearTimeout(this.state.loadingState);
    }
    const loadingState = setTimeout(() => {
      this.setState({
        loadingState: 0,
        errorCode: 'timeout',
        sid: Date.now(),
        lockState: null,
        actionState: '',
        showTools: false,
      });
    }, this.props.timeout || 5000);
    this.setState({loadingState, errorCode: ''});
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

  onRetryToPrev = () => {
    this.setState({errorCode: ''}, this.onScrollToUpper);
  };

  onRetryToNext = () => {
    this.setState({errorCode: ''}, this.onScrollToLower);
  };

  onDatasourceChange = (datasource: Datasource<T>) => {
    this.props.onDatasourceChange && this.props.onDatasourceChange(datasource, this.curScrollTop);
  };

  onScrollTopChange = (scrollTop: number, direction: '' | 'up' | 'down') => {
    this.props.onScroll && this.props.onScroll(scrollTop, direction, this.curDatasource!);
  };

  defaultTools = (
    curPage: [number, number] | number,
    totalPages: number,
    totalItems: number,
    show: boolean,
    loading: boolean,
    onTurning: (page?: number) => void
  ) => {
    return <Tools curPage={curPage} totalPages={totalPages} show={show} onTurning={onTurning} loading={loading} className={this.props.className} />;
  };

  switchTools = (showTools: boolean) => {
    if (this.toolsTimer) {
      clearTimeout(this.toolsTimer);
    }
    this.toolsTimer = setTimeout(
      () => {
        this.state.showTools !== showTools && this.setState({showTools});
        this.toolsTimer = 0;
      },
      showTools ? 300 : 1200
    );
  };

  render() {
    const {className = '', children, tools = this.defaultTools, topArea = defaultTopArea, bottomArea = defaultBottomArea} = this.props;
    const {page, list, scrollTop, actionState, totalPages, totalItems, loadingState, errorCode, showTools} = this.state;
    const [firstPage, secondPage] = typeof page === 'object' ? page : [page, page];
    if (actionState === '') {
      this.prevPageNum = page;
    }
    const listComponent = this.memoList(children, list);
    const toolsComponent = this.memoTools(tools, this.prevPageNum, totalPages, totalItems, showTools, !!loadingState, this.onToolsTurning);
    const topAreaComponent = this.memoTopArea(
      topArea,
      firstPage > 1,
      firstPage - 1,
      actionState === 'prev' || actionState === 'prev-reclaiming',
      errorCode,
      this.onRetryToPrev
    );
    const bottomAreaComponent = this.memoBottomArea(
      bottomArea,
      secondPage < totalPages,
      secondPage + 1,
      actionState === 'next' || actionState === 'next-reclaiming',
      errorCode,
      this.onRetryToNext
    );
    return (
      <>
        {toolsComponent}
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
          <View className="ppscroll-content">
            {topAreaComponent}
            {listComponent}
            {bottomAreaComponent}
          </View>
        </ScrollView>
      </>
    );
  }
}

export default Component;
