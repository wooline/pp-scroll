import React, {ReactNode, RefObject, PureComponent} from 'react';
import memoizeOne from 'memoize-one';
import Tools from './Tools';
import ScrollView from './ScrollView';

export interface DataSource<T = any> {
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
  datasource: DataSource<T>;
  onScroll?: (scrollTop: number, scrollState: '' | 'up' | 'down') => void;
  onTurning: (page: [number, number] | number, sid: number) => void;
  onDatasourceChange?: (datasource: DataSource<T>) => void;
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
interface State<T = any> extends Required<DataSource<T>> {
  datasource: DataSource<T> | null;
  cacheDatasource: DataSource<T> | null;
  sourceCache: {[page: number]: DataSource<T>};
  lockState: State<T> | null;
  actionState: '' | 'next' | 'prev' | 'prev-reclaiming' | 'next-reclaiming';
  scrollState: '' | 'up' | 'down';
  loadingState: number;
  errorCode: string;
  showTools: boolean;
}
interface MemoCache {
  result?: any;
  depes?: any[];
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
      if (datasource.sid >= prevState.sid) {
        if (prevState.loadingState) {
          clearTimeout(prevState.loadingState);
        }
        if (datasource.errorCode) {
          Object.assign(newState, {
            lockState: null,
            actionState: '',
            scrollState: '',
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
        }
        Object.assign(newState, {
          sourceCache,
          lockState: null,
          actionState: '',
          scrollState: '',
          loadingState: 0,
          errorCode: '',
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
              scrollState: '',
              loadingState: 0,
              errorCode: '',
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

  scrollTimer: number = 0;

  toolsTimer: number = 0;

  reclaiming?: () => void;

  listData: T[] = [];

  prevPageNum: [number, number] | number = 0;

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
      callback: (datasource: DataSource<T>) => void,
      sid: number,
      list: T[],
      page: [number, number] | number,
      totalPages: number,
      totalItems: number,
      scrollTop: number,
      firstSize?: number,
      errorCode?: string
    ) => {
      const datasource: DataSource<T> = {scrollTop, page, list, totalPages, totalItems, firstSize, sid, errorCode};
      callback(datasource);
      return datasource;
    }
  );

  memoShowTools = memoizeOne((switchTools: (show: boolean) => void, show: boolean) => {
    switchTools(show);
    return show;
  });

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
    if (reclaiming) {
      this.reclaiming = undefined;
      if (curActionState === 'next' && snapshot) {
        const [prevScrollTop, prevScrollHeight] = snapshot;
        listRef.scrollTop = prevScrollTop - (prevScrollHeight - listRef.scrollHeight);
      }
      reclaiming();
    } else {
      const prevActionState = prevState.actionState;
      if (curActionState === 'next-reclaiming' && prevActionState === 'next') {
        setTimeout(() => this.setState({actionState: ''}), 0);
      } else if (curActionState === 'prev-reclaiming' && prevActionState === 'prev') {
        // 如果慢速滚动，浏览器会根据内容变动自动重算list.scrollTop，所以不能使用list.scrollTop+；
        const [prevScrollTop, prevScrollHeight] = snapshot;
        const scrollTop = prevScrollTop + (listRef.scrollHeight - prevScrollHeight);
        listRef.scrollTop = scrollTop;
        setTimeout(() => this.setState({actionState: ''}), 0);
      }
      if ((curActionState === '' || curActionState === 'prev' || curActionState === 'next') && this.props.onDatasourceChange) {
        const {page, list, firstSize, sid, errorCode, totalPages, totalItems} = this.state;
        this.memoDatasource(this.props.onDatasourceChange, sid, list, page, totalPages, totalItems, this.curScrollTop, firstSize, errorCode);
      }
    }
    this.memoShowTools(this.switchTools, !!curActionState || !!this.state.loadingState);
    if (curActionState !== 'prev-reclaiming' && curActionState !== 'next-reclaiming' && this.props.onDatasourceChange) {
      const {page, list, firstSize, sid, errorCode, totalPages, totalItems} = this.state;
      this.memoDatasource(this.props.onDatasourceChange, sid, list, page, totalPages, totalItems, this.curScrollTop, firstSize, errorCode);
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
    this.props.onScroll && this.props.onScroll(this.curScrollTop, this.state.scrollState);
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
        scrollState: '',
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
