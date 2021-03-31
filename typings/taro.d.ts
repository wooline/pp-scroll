declare module '@tarojs/taro' {
  const nextTick: (callback: () => void) => void;
  const createSelectorQuery: () => any;
  const pxTransform: (n: number) => string;
}
declare module '@tarojs/components' {
  const View: any;
  const ScrollView: any;
  const Text: any;
  const Picker: any;
}
