/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable react/no-did-update-set-state */
import React, {ReactNode, RefObject, PureComponent} from 'react';
import memoizeOne from 'memoize-one';
import Tools from './Tools';
import ScrollView from './ScrollView';

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
  onScroll?: (scrollTop: number, direction: '' | 'up' | 'down', curDatasource: Datasource<T>) => void;
  onTurning: (page: [number, number] | number, sid: number) => void;
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
  actionState: '' | 'next' | 'prev' | 'prev-readied' | 'next-readied' | 'prev-executing' | 'next-executing';
  loadingState: number;
  errorCode: string;
  showTools: boolean;
}

const defaultTopArea = (morePage: boolean, prevPage: number, loading: boolean, errorCode: string, retry: () => void) => {
  if (morePage) {
    if (errorCode) {
      return (
        <div className="ppscroll-tips error" onClick={retry}>
          出错了，点击重试
        </div>
      );
    }
    return <div className={`ppscroll-tips ${loading ? ' loading' : ''}`}>Loading</div>;
  }
  return null;
};

const defaultBottomArea = (morePage: boolean, nextPage: number, loading: boolean, errorCode: string, retry: () => void) => {
  if (morePage) {
    if (errorCode) {
      return (
        <div className="ppscroll-tips error" onClick={retry}>
          出错了，点击重试
        </div>
      );
    }
    return <div className={`ppscroll-tips ${loading ? ' loading' : ''}`}>Loading</div>;
  }
  return <div className="ppscroll-tips">没有更多</div>;
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
              actionState: 'prev-executing',
              loadingState: 0,
              errorCode: '',
              list: [...datasource.list, ...curList],
              page: [datasource.page, curPage],
              firstSize: datasource.list.length,
            };
          } else {
            lockState = {
              lockState: null,
              actionState: 'next-executing',
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

  onReady?: [number, number] | Datasource;

  listData: T[] = [];

  prevPageNum: [number, number] | number = 0;

  curDatasource?: Datasource;

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
      (curActionState === 'next-executing' && prevActionState === 'next-readied') ||
      (curActionState === 'prev-executing' && prevActionState === 'prev-readied')
    ) {
      const list = this.listRef.current;
      return [list.scrollTop, list.scrollHeight];
    }

    return null;
  }

  componentDidUpdate(prevProps: Props, prevState: State, snapshot: [number, number]) {
    const listRef = this.listRef.current;
    const curActionState = this.state.actionState;
    const prevActionState = prevState.actionState;
    if (this.state.scrollTop !== prevState.scrollTop) {
      this.curScrollTop = this.state.scrollTop;
    }
    if ((curActionState === 'prev' || curActionState === 'next') && prevActionState === '' && this.onReady) {
      if (curActionState === 'next' && isIE) {
        const [prevScrollTop, prevScrollHeight] = snapshot;
        listRef.scrollTop = prevScrollTop - (prevScrollHeight - listRef.scrollHeight);
      }
      this.curScrollTop = listRef.scrollTop;
      const nextActionState = curActionState === 'prev' ? 'prev-readied' : 'next-readied';
      const onReady = this.onReady;
      this.onReady = undefined;
      if (Array.isArray(onReady)) {
        this.setState({actionState: nextActionState});
        this.onTurning(onReady[0], onReady[1]);
      } else if (typeof onReady === 'object') {
        this.setState({actionState: nextActionState, cacheDatasource: onReady});
      }
    } else if (this.state.lockState) {
      if (this.scrollState === '') {
        this.setState(this.state.lockState);
      }
    } else if (curActionState === 'next-executing' && prevActionState !== 'next-executing') {
      this.setState({actionState: ''});
    } else if (curActionState === 'prev-executing' && prevActionState !== 'prev-executing') {
      // 如果慢速滚动，浏览器会根据内容变动自动重算list.scrollTop，所以不能使用list.scrollTop+；
      const [prevScrollTop, prevScrollHeight] = snapshot;
      const scrollTop = prevScrollTop + (listRef.scrollHeight - prevScrollHeight);
      listRef.scrollTop = scrollTop;
      this.curScrollTop = listRef.scrollTop;
      this.setState({actionState: ''});
    }
    this.memoShowTools(this.switchTools, !!this.scrollState || !!this.state.loadingState);
    if (curActionState === '' || curActionState === 'prev-readied' || curActionState === 'next-readied') {
      const {page, list, firstSize, totalPages, totalItems} = this.state;
      this.curDatasource = this.memoDatasource(this.onDatasourceChange, list, page, totalPages, totalItems, firstSize);
    }
  }

  onScrollToLower = () => {
    const {actionState, page, list, firstSize, sourceCache, totalPages, errorCode} = this.state;
    if (!errorCode && (actionState === '' || actionState === 'prev-readied')) {
      const secondPage = typeof page === 'object' ? page[1] : page;
      const secondList = typeof page === 'object' ? list.slice(firstSize) : list;
      if (secondPage < totalPages) {
        const sid = Date.now();
        const nextPage = secondPage + 1;
        let cacheDatasource = sourceCache[nextPage];
        if (cacheDatasource) {
          cacheDatasource = {...cacheDatasource, sid};
        }
        const newState: Partial<State> = {
          sid,
          actionState: actionState === '' ? 'next' : 'next-readied',
          lockState: null,
        };

        if (actionState === '') {
          Object.assign(newState, {list: secondList, page: secondPage});
          if (cacheDatasource) {
            this.onReady = cacheDatasource;
          } else {
            this.onReady = [nextPage, sid];
          }
        } else if (cacheDatasource) {
          newState.cacheDatasource = cacheDatasource;
        } else {
          this.onTurning(nextPage, sid);
        }
        this.setState(newState as State);
      }
    }
  };

  onScrollToUpper = () => {
    const {actionState, page, list, firstSize, sourceCache, errorCode} = this.state;
    if (!errorCode && (actionState === '' || actionState === 'next-readied')) {
      const firstPage = typeof page === 'object' ? page[0] : page;
      const firstList = typeof page === 'object' ? list.slice(0, firstSize) : list;
      if (firstPage > 1) {
        const sid = Date.now();
        const prevPage = firstPage - 1;
        let cacheDatasource = sourceCache[prevPage];
        if (cacheDatasource) {
          cacheDatasource = {...cacheDatasource, sid};
        }
        const newState: Partial<State> = {
          sid,
          lockState: null,
          actionState: actionState === '' ? 'prev' : 'prev-readied',
        };
        if (actionState === '') {
          Object.assign(newState, {list: firstList, page: firstPage});
          if (cacheDatasource) {
            this.onReady = cacheDatasource;
          } else {
            this.onReady = [prevPage, sid];
          }
        } else if (cacheDatasource) {
          newState.cacheDatasource = cacheDatasource;
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
      if (actionState === '' || actionState === 'prev-readied' || actionState === 'next-readied') {
        this.onScrollTopChange(curScrollTop, scrollState);
      }
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
    this.curDatasource && this.props.onScroll && this.props.onScroll(scrollTop, direction, this.curDatasource);
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
      actionState === 'prev' || actionState === 'prev-executing',
      errorCode,
      this.onRetryToPrev
    );
    const bottomAreaComponent = this.memoBottomArea(
      bottomArea,
      secondPage < totalPages,
      secondPage + 1,
      actionState === 'next' || actionState === 'next-executing',
      errorCode,
      this.onRetryToNext
    );
    return (
      <>
        {toolsComponent}
        <ScrollView
          forwardedRef={this.listRef}
          className={`ppscroll ${className} ${loadingState ? 'loading' : ''}`}
          scrollTop={scrollTop}
          onScroll={this.onScroll}
          onScrollToLower={this.onScrollToLower}
          onScrollToUpper={this.onScrollToUpper}
          upperThreshold={100}
          lowerThreshold={100}
        >
          <div className="ppscroll-content">
            {topAreaComponent}
            {listComponent}
            {bottomAreaComponent}
          </div>
        </ScrollView>
      </>
    );
  }
}

export default Component;
