import React, {useState, useCallback, useEffect} from 'react';
import PPScroll, {DataSource} from '../../';
import {ListItem, fetchPhotosList} from './api';
import logo from './logo.svg';
import './App.css';

function App() {
  const [photoDatasource, setPhotoDatasource] = useState<DataSource | null>(null);

  useEffect(() => {
    const {
      list,
      listSummary: {page, totalPages, firstSize},
    } = fetchPhotosList(1);
    setPhotoDatasource({list, page, totalPages, firstSize, sid: Date.now()});
  }, []);

  const children = useCallback((realList: ListItem[]) => {
    return (
      <div className="g-pic-list">
        {realList.map((item) => (
          <div key={item.id} className="list-item">
            <div className="list-pic" style={{backgroundImage: `url(${item.coverUrl})`}}>
              <div className="list-title">
                {item.id}
                {item.title}
              </div>
              <div className="listImg" />
              <div className="props">
                <div className="at-icon at-icon-map-pin" /> {item.departure}
                <div className="at-icon at-icon-star" style={{marginLeft: '5px'}} /> {item.type}
              </div>
              <div className="desc">
                <div className="price">
                  <span className="unit">￥</span>
                  <span className="num">{item.price}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, []);

  const onTurning = useCallback((page: [number, number] | number, sid: number) => {
    // App.router.replace(
    //   {pagename: '/photo/list', params: {photo: {listSearchPre: {pageCurrent: page}, listVerPre: sid}}, extendParams: 'current'},
    //   true
    // );
  }, []);

  return (
    <>
      <header className="app-header">
        <img src={logo} className="app-logo" alt="logo" />
      </header>
      <div className="app-body">
        {photoDatasource && (
          <PPScroll className="aaaa" datasource={photoDatasource} onTurning={onTurning}>
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
