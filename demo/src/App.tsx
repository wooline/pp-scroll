import React, {useState, useCallback, useEffect, useRef} from 'react';
import PPScroll, {Datasource} from 'pp-scroll';
import {ListItem, fetchPhotosList} from './api';
import logo from './logo.svg';
import './App.css';
import 'pp-scroll/css/index.css';

function App() {
  const [photoDatasource, setPhotoDatasource] = useState<Datasource | null>(null);

  useEffect(() => {
    const [pageStr = '1', scrollTopStr = '0'] = window.location.hash.replace('#', '').split('|');
    const pageArr = pageStr.split(',').map((str) => parseInt(str) || 1);
    const page: number | [number, number] = pageArr.length === 1 ? pageArr[0] : [pageArr[0], pageArr[1]];
    fetchPhotosList(page).then((res) => {
      const {
        list,
        listSummary: {page, totalPages, totalItems, firstSize},
      } = res;
      setPhotoDatasource({list, page, totalPages, totalItems, firstSize, sid: Date.now(), scrollTop: parseInt(scrollTopStr)});
    });
  }, []);

  const children = useCallback((realList: ListItem[]) => {
    return (
      <div className="pic-list">
        {realList.map((item) => (
          <div key={item.id} className="list-item">
            <div className="list-pic" style={{backgroundImage: `url(${item.coverUrl})`}}>
              <div className="list-title">
                {item.id}
                {item.title}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, []);

  const onTurning = useCallback(async (page: [number, number] | number, sid: number) => {
    const res = await fetchPhotosList(page);
    const {
      list,
      listSummary: {totalPages, totalItems, firstSize},
    } = res;
    setPhotoDatasource({list, page, totalPages, totalItems, firstSize, sid});
  }, []);

  const scrollTimer = useRef<{timer: any; location: string}>({timer: 0, location: ''});

  const onScroll = useCallback((scrollTop: number, direction: string, datasource: Datasource) => {
    if (!datasource) {
      return;
    }
    const location = `#${datasource.page}|${scrollTop}`;
    console.log('onScroll', location);
    const obj = scrollTimer.current;
    obj.location = location;
    if (!obj.timer) {
      obj.timer = setTimeout(() => {
        obj.timer = 0;
        // eslint-disable-next-line no-restricted-globals
        history.replaceState(null, '', obj.location);
      }, 1000);
    }
  }, []);

  const onDatasourceChange = useCallback((datasource: Datasource, scrollTop: number) => {
    const location = `#${datasource.page}|${scrollTop}`;
    console.log('onDatasourceChange', location);
    // eslint-disable-next-line no-restricted-globals
    history.replaceState(null, '', location);
  }, []);

  return (
    <>
      <header className="app-header">
        <img src={logo} className="app-logo" alt="logo" />
      </header>
      <div className="app-body">
        {photoDatasource && (
          <PPScroll datasource={photoDatasource} onTurning={onTurning} onDatasourceChange={onDatasourceChange} onScroll={onScroll}>
            {children}
          </PPScroll>
        )}
      </div>
      <footer className="app-footer">
        <img src={logo} className="app-logo" alt="logo" />
      </footer>
    </>
  );
}

export default App;
