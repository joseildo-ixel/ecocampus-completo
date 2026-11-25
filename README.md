# EcoCampusIFPE

Aplicação de gestão de descartes e coletores do campus, com frontend React, API NestJS e banco PostgreSQL. O Docker Compose sobe os três serviços; não é necessário instalar Node.js ou PostgreSQL na máquina da equipe.

## Requisitos

- Git
- Docker Desktop com Docker Compose v2 ativo (Windows, macOS ou Linux)

## Executar em outra máquina da equipe

1. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/joseildo-ixel/ecocampus-completo.git
   cd ecocampus-completo
   ```

2. Crie o arquivo local de configuração a partir do exemplo:

   **PowerShell**

   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS/Linux**

   ```bash
   cp .env.example .env
   ```

3. Construa as imagens e inicie os serviços:

   ```bash
   docker compose up -d --build
   ```

4. Acesse a aplicação no navegador:

   - Frontend: <http://localhost:5173>
   - API: <http://localhost:3000>

   O PostgreSQL fica disponível na porta `5432`. As migrations do banco são aplicadas automaticamente quando a API inicia.

## Acesso de outro computador na mesma rede

Se um colega acessar o frontend hospedado na sua máquina, o frontend também precisa saber o endereço de rede dessa máquina para chamar a API:

1. Descubra o endereço IP local da máquina que está executando Docker.
2. No `.env` dessa máquina, altere `VITE_API_URL` para `http://<IP-DA-MAQUINA>:3000` (por exemplo, `http://192.168.1.25:3000`).
3. Recrie os serviços: `docker compose up -d --build`.
4. O colega acessa `http://<IP-DA-MAQUINA>:5173`.

Permita as portas `5173` e `3000` no firewall da máquina anfitriã. Use essa configuração apenas em uma rede confiável; não exponha diretamente a aplicação ou o banco à internet.

## Primeiro acesso

Se ainda não existir um administrador, a API cria a conta de demonstração:

- E-mail: `admin@ifpe.edu.br`
- Senha: `Admin@123`

Essa senha é apenas para desenvolvimento e demonstração. Não use a configuração padrão em produção.

## Comandos úteis

```bash
# Ver estado dos containers
docker compose ps

# Acompanhar os logs
docker compose logs -f
docker compose logs -f backend

# Reconstruir e aplicar alterações do código
docker compose up -d --build

# Parar os serviços mantendo os dados do banco
docker compose down
```

Os dados do PostgreSQL ficam em um volume Docker e persistem após `docker compose down`. Para apagar também o banco e todos os dados locais, use `docker compose down -v`; essa operação é destrutiva.

## Desenvolvimento sem Docker

- Frontend: entre em `frontend`, instale com `npm install` e inicie com `npm run dev`.
- Backend: entre em `backend`, instale com `pnpm install` e use `pnpm start:dev`. O backend precisa de um PostgreSQL acessível e das variáveis de conexão `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` e `DB_NAME`.
