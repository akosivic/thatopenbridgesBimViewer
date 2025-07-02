import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const enTranslations = {
  logout: 'Logout',
  login: 'Login',
  bimManager: 'BIM Manager',
  project: 'Project',
  settings: 'Settings',
  help: 'Help',
  // Selection toolbar
  selection: 'Selection',
  showAll: 'Show All',
  showAllTooltip: 'Shows all elements in all models.',
  toggleVisibility: 'Toggle Visibility',
  toggleVisibilityTooltip: 'From the current selection, hides visible elements and shows hidden elements.',
  isolate: 'Isolate',
  isolateTooltip: 'Isolates the current selection.',
  focus: 'Focus',
  focusTooltip: 'Focus the camera to the current selection.',
  // Camera toolbar
  camera: 'Camera',
  fitModel: 'Fit Model',
  disable: 'Disable',
  enable: 'Enable',
  // Measurement toolbar
  measurements: 'Measurements',
  enabled: 'Enabled',
  deleteAll: 'Delete all',
  edge: 'Edge',
  face: 'Face',
  volume: 'Volume',
  length: 'Length',
  area: 'Area',
  // Import toolbar
  import: 'Import',
  ifc: 'IFC',
  loadIfc: 'Load IFC',
  loadIfcTooltip: 'Loads an IFC file into the scene. The IFC gets automatically converted to Fragments.',
  fragments: 'Fragments',
  loadFragments: 'Load Fragments',
  loadFragmentsTooltip: 'Loads a pre-converted IFC from a Fragments file. Use this option if you want to avoid the conversion from IFC to Fragments.',
  tiles: 'Tiles',
  loadTiles: 'Load BIM Tiles',
  loadTilesTooltip: 'Loads a pre-converted IFC from a Tiles file to stream the model. Perfect for big models.',
  // Project Information panel
  loadedModels: 'Loaded Models',
  spatialStructures: 'Spatial Structures',
  search: 'Search...',
  lights: 'Lights',
  on: 'On',
  off: 'Off',
  // Groupings panel
  customSelections: 'Custom Selections',
  selectionName: 'Selection Name...',
  accept: 'Accept',
  cancel: 'Cancel',
  saveSelection: 'Save Selection',
  delete: 'Delete',
  // Settings panel
  aspect: 'Aspect',
  system: 'System',
  dark: 'Dark',
  light: 'Light',
  worlds: 'Worlds',
  // Help panel
  thatOpenPeople: 'That Open People at your disposal',
  thatOpenPeopleDesc: 'Feel stuck? Within our community, That Open People, you\'ll find all the answers to your doubts and the place where "openers" meet, learn, grow and build the open future together.',
  meetThatOpenPeople: 'Meet That Open People',
  becomeBimDev: 'Become a BIM Software Developer',
  becomeBimDevDesc: 'Want a career change? Enter this new market full of opportunities! Go step-by-step from zero to hero in becoming a BIM Software Developer to make a successful career out of it.',
  joinToMaster: 'Join To Master',
  getTheCode: 'Get The Code and Boost your Career',
  getTheCodeDesc: 'Eager to succeed? Sign up for Get The Code, our premium membership where you will get all the resources you need to succeed as a BIM Software Developer in the long term and where you can start making money from day one.',
  getTheCodeBtn: 'Get The Code'
};

// Japanese translations
const jaTranslations = {
  logout: 'ログアウト',
  login: 'ログイン',
  bimManager: 'BIMマネージャー',
  project: 'プロジェクト',
  settings: '設定',
  help: 'ヘルプ',
  // Selection toolbar
  selection: '選択',
  showAll: 'すべて表示',
  showAllTooltip: 'すべてのモデルのすべての要素を表示します。',
  toggleVisibility: '表示切替',
  toggleVisibilityTooltip: '現在の選択から、表示要素を非表示にし、非表示要素を表示します。',
  isolate: '分離',
  isolateTooltip: '現在の選択を分離します。',
  focus: 'フォーカス',
  focusTooltip: 'カメラを現在の選択にフォーカスします。',
  // Camera toolbar
  camera: 'カメラ',
  fitModel: 'モデルに合わせる',
  disable: '無効化',
  enable: '有効化',
  // Measurement toolbar
  measurements: '測定',
  enabled: '有効',
  deleteAll: 'すべて削除',
  edge: 'エッジ',
  face: '面',
  volume: '体積',
  length: '長さ',
  area: '面積',
  // Import toolbar
  import: 'インポート',
  ifc: 'IFC',
  loadIfc: 'IFC読み込み',
  loadIfcTooltip: 'IFCファイルをシーンに読み込みます。IFCは自動的にフラグメントに変換されます。',
  fragments: 'フラグメント',
  loadFragments: 'フラグメント読み込み',
  loadFragmentsTooltip: '事前変換されたIFCをフラグメントファイルから読み込みます。IFCからフラグメントへの変換を避けたい場合はこのオプションを使用します。',
  tiles: 'タイル',
  loadTiles: 'BIMタイル読み込み',
  loadTilesTooltip: '事前変換されたIFCをタイルファイルからストリーミングします。大きなモデルに最適です。',
  // Project Information panel
  loadedModels: '読み込み済みモデル',
  spatialStructures: '空間構造',
  search: '検索...',
  lights: 'ライト',
  on: 'オン',
  off: 'オフ',
  // Groupings panel
  customSelections: 'カスタム選択',
  selectionName: '選択名...',
  accept: '確認',
  cancel: 'キャンセル',
  saveSelection: '選択を保存',
  delete: '削除',
  // Settings panel
  aspect: '外観',
  system: 'システム',
  dark: 'ダーク',
  light: 'ライト',
  worlds: 'ワールド',
  // Help panel
  thatOpenPeople: 'That Open Peopleがあなたをサポート',
  thatOpenPeopleDesc: '困っていますか？私たちのコミュニティ、That Open Peopleでは、あなたの疑問に対するすべての答えと、「オープナー」が出会い、学び、成長し、オープンな未来を共に構築する場所を見つけることができます。',
  meetThatOpenPeople: 'That Open Peopleに参加',
  becomeBimDev: 'BIMソフトウェア開発者になる',
  becomeBimDevDesc: 'キャリアチェンジをお考えですか？チャンスに満ちた新しい市場に参入しましょう！ゼロからヒーローへのステップバイステップで、BIMソフトウェア開発者としての成功したキャリアを築きましょう。',
  joinToMaster: 'マスターに参加',
  getTheCode: 'コードを入手してキャリアを加速',
  getTheCodeDesc: '成功したいですか？Get The Codeにサインアップして、長期的にBIMソフトウェア開発者として成功するために必要なすべてのリソースを手に入れ、初日から収益を上げることができるプレミアムメンバーシップに参加しましょう。',
  getTheCodeBtn: 'コードを入手'
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      ja: {
        translation: jaTranslations
      }
    },
    lng: 'ja',
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;