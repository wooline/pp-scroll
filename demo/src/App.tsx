import React, {useState, useCallback, useEffect} from 'react';
import PPScroll, {DataSource} from 'pp-scroll';
import {ListItem, fetchPhotosList} from './api';
import logo from './logo.svg';
import './App.css';
import 'pp-scroll/css/index.css';

function App() {
  const [photoDatasource, setPhotoDatasource] = useState<DataSource | null>(null);

  useEffect(() => {
    fetchPhotosList(1).then((res) => {
      const {
        list,
        listSummary: {page, totalPages, totalItems, firstSize},
      } = res;
      setPhotoDatasource({list, page, totalPages, totalItems, firstSize, sid: Date.now()});
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

  return (
    <>
      <header className="app-header">
        <img src={logo} className="app-logo" alt="logo" />
      </header>
      <div className="app-body">
        {photoDatasource && (
          <PPScroll datasource={photoDatasource} onTurning={onTurning}>
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
