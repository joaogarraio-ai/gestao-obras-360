import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import LancarDias from './pages/LancarDias'
import Materiais from './pages/Materiais'
import Despesas from './pages/Despesas'
import Relatorio from './pages/Relatorio'
import Cadastros from './pages/Cadastros'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/lancar-dias" element={<LancarDias />} />
          <Route path="/materiais" element={<Materiais />} />
          <Route path="/despesas" element={<Despesas />} />
          <Route path="/relatorio" element={<Relatorio />} />
          <Route path="/cadastros" element={<Cadastros />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
