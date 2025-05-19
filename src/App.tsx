import './App.css'
import AppRouter from './routers/Routers'
import { UserProvider } from "@/context/UserContext";

function App() {

  return (
    <UserProvider>
      <AppRouter />
    </UserProvider>
  )
}

export default App
