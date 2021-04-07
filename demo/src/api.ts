import mockjs from 'mockjs';

export interface ListItem {
  id: string;
  title: string;
  departure: string;
  type: string;
  hot: number;
  comments: number;
  price: number;
  coverUrl: string;
}
export interface ListSummary {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
export interface ListSearch {
  page: string;
  pageSize: string;
}

export interface DualListSummary {
  page: number | [number, number];
  firstSize?: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const datasource = (function createPhotoList() {
  const listData: {[key: string]: ListItem} = {};
  mockjs
    .mock({
      'list|100': [
        {
          'id|+1': 1,
          title: '@ctitle(10, 20)',
          departure: '@city',
          type: '@cword(2,5)',
          price: '@natural(1000,2000)',
          hot: '@natural(100,999)',
          comments: '@natural(100,999)',
          coverUrl: '',
        },
      ],
    })
    .list.forEach((item: any) => {
      item.id = `${item.id}`;
      item.coverUrl = `/imgs/${item.id % 17}.jpg`;
      listData[item.id] = item;
    });
  return listData;
})();

async function getPhotosList(page: number, pageSize: number = 15) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const listData = Object.keys(datasource).map((id) => {
    return datasource[id];
  });
  const totalItems = listData.length;
  const result: {list: ListItem[]; listSummary: ListSummary} = {
    listSummary: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(listData.length / pageSize),
    },
    list: listData.slice(start, end),
  };
  console.log('ajax request page ' + page);
  return result;
}

export async function fetchPhotosList(page: number | [number, number]): Promise<{list: ListItem[]; listSummary: DualListSummary}> {
  if (typeof page === 'number') {
    return getPhotosList(page);
  } else {
    const [page1, page2] = await Promise.all([getPhotosList(page[0]), getPhotosList(page[1])]);
    const {pageSize, totalItems, totalPages} = page1.listSummary;
    return {list: [...page1.list, ...page2.list], listSummary: {page, pageSize, totalItems, totalPages, firstSize: page1.list.length}};
  }
}
