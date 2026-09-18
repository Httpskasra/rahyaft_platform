import ProductionRunPage from '@/features/production/ProductionRunPage';
export default function Page({params}:{params:Promise<{id:string}>}){ return <ProductionRunPage params={params}/> }
