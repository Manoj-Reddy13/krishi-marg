import fs from 'fs'
import path from 'path'

const dist = path.resolve('dist')
const index = path.join(dist, 'index.html')

if (fs.existsSync(index)) {
  const content = fs.readFileSync(index, 'utf8')
  
  // 1. Universal 404 fallback for Vercel
  fs.writeFileSync(path.join(dist, '404.html'), content)
  
  // 2. Universal 200 fallback
  fs.writeFileSync(path.join(dist, '200.html'), content)
  
  // 3. Physical directory for /app
  const appDir = path.join(dist, 'app')
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true })
  fs.writeFileSync(path.join(appDir, 'index.html'), content)
  
  // 4. Physical directory for /login
  const loginDir = path.join(dist, 'login')
  if (!fs.existsSync(loginDir)) fs.mkdirSync(loginDir, { recursive: true })
  fs.writeFileSync(path.join(loginDir, 'index.html'), content)
  
  console.log('Postbuild: Successfully generated 404.html, 200.html, app/index.html, login/index.html')
}
