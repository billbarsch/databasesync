# Database Sync - Sincronização de Bancos de Dados MySQL

Uma aplicação Electron para comparar e sincronizar bancos de dados MySQL com interface gráfica intuitiva.

## 🚀 Características

- ✅ **Interface Amigável**: Design moderno e responsivo
- ✅ **Conexão Dupla**: Conecte-se a dois bancos de dados MySQL simultaneamente
- ✅ **Comparação Visual**: Compare tabelas lado a lado com destaque colorido
- ✅ **Filtros Avançados**: Filtre por tabelas diferentes, iguais ou faltantes
- ✅ **Estatísticas**: Resumo completo das diferenças encontradas
- ✅ **Persistência Local**: Configurações e histórico salvos em SQLite
- ✅ **Histórico de Comparações**: Mantenha registro de todas as análises
- ✅ **Compilação para .exe**: Gere executável para Windows

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Acesso aos bancos de dados MySQL que deseja comparar

## 🔧 Instalação

1. **Clone ou baixe o projeto**
   ```bash
   git clone <url-do-repositorio>
   cd databasesync
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

## 🏃‍♂️ Executando a Aplicação

### Modo de Desenvolvimento
```bash
npm start
```

### Compilar para Windows (.exe)
```bash
npm run build-win
```

O arquivo executável será gerado na pasta `dist/`.

## 📖 Como Usar

### 1. Configurar Conexões
1. Execute a aplicação
2. Clique em **"Configurar Conexões"** ou use o menu `Arquivo > Configurar Conexões`
3. Preencha os dados de conexão para ambos os bancos:
   - **Servidor (Host)**: Endereço do servidor MySQL
   - **Porta**: Porta do MySQL (padrão: 3306)
   - **Usuário**: Nome de usuário do banco
   - **Senha**: Senha do banco
   - **Banco de Dados**: Nome do banco de dados
4. Teste cada conexão clicando em **"Testar Conexão"**
5. Salve as configurações

### 2. Comparar Tabelas
1. Após configurar ambas as conexões, clique em **"Comparar Tabelas"**
2. A aplicação irá:
   - Listar todas as tabelas de ambos os bancos
   - Contar os registros de cada tabela
   - Destacar as diferenças com cores:
     - 🟢 **Verde**: Tabelas com mesma quantidade de registros
     - 🟡 **Amarelo**: Tabelas com quantidades diferentes
     - 🔴 **Vermelho**: Tabelas que existem apenas em um banco

### 3. Filtrar Resultados
Use o menu suspenso **"Filtrar"** para visualizar:
- **Todas as tabelas**: Mostra tudo
- **Apenas diferentes**: Tabelas com quantidades diferentes
- **Apenas iguais**: Tabelas com mesma quantidade
- **Tabelas faltantes**: Tabelas que existem apenas em um banco

### 4. Visualizar Histórico
1. Clique em **"Ver Histórico"** na tela principal ou use o menu `Arquivo > Histórico de Comparações`
2. Navegue por todas as comparações realizadas anteriormente
3. Clique em qualquer item para ver detalhes completos
4. Use os filtros para mostrar diferentes quantidades de histórico

## 🎨 Interface

### Tela Principal
- Visão geral da aplicação
- Status das conexões configuradas
- Acesso rápido às funcionalidades principais

### Tela de Configuração
- Formulários lado a lado para configurar ambos os bancos
- Teste de conexão em tempo real
- Validação de campos obrigatórios

### Tela de Comparação
- Tabela comparativa com layout responsivo
- Legenda de cores para fácil identificação
- Estatísticas resumidas
- Filtros dinâmicos

### Tela de Histórico
- Lista de todas as comparações realizadas
- Detalhes completos de cada análise
- Filtros por quantidade de registros
- Modal com informações expandidas

## 💾 Persistência de Dados

A aplicação utiliza SQLite para armazenar localmente:

### Configurações de Conexão
- Dados dos servidores MySQL (host, porta, usuário, banco)
- Senhas são armazenadas de forma segura
- Histórico de configurações utilizadas

### Histórico de Comparações
- Data e hora de cada comparação
- Nomes dos bancos comparados
- Dados completos das tabelas e contagens
- Estatísticas resumidas (total, diferentes, iguais, faltantes)

### Configurações da Aplicação
- Preferências do usuário
- Configurações de interface
- Últimas configurações utilizadas

**Localização do banco:** O arquivo `databasesync.db` é criado automaticamente na pasta de dados do usuário do sistema operacional.

📋 **Para mais detalhes sobre o SQLite:** Consulte [SQLITE.md](SQLITE.md) para documentação completa sobre o banco de dados local.

## 🔍 Detalhes Técnicos

### Tecnologias Utilizadas
- **Electron**: Framework para aplicações desktop
- **Node.js**: Runtime JavaScript
- **mysql2**: Driver MySQL para Node.js
- **sqlite3**: Banco de dados local para persistência
- **HTML/CSS/JavaScript**: Interface do usuário

### Estrutura do Projeto
```
databasesync/
├── main.js              # Processo principal do Electron
├── database.js          # Gerenciador do banco SQLite
├── index.html           # Tela principal
├── config.html          # Tela de configuração
├── compare.html         # Tela de comparação
├── history.html         # Tela de histórico
├── styles.css           # Estilos da aplicação
├── renderer.js          # Lógica da tela principal
├── package.json         # Configurações e dependências
├── assets/              # Ícones e recursos
└── README.md           # Este arquivo
```

## 🐛 Solução de Problemas

### Erro de Conexão MySQL
- Verifique se o servidor MySQL está rodando
- Confirme as credenciais de acesso
- Teste a conectividade de rede
- Verifique se o usuário tem permissões adequadas

### Aplicação não Inicia
- Certifique-se de que o Node.js está instalado
- Execute `npm install` para instalar dependências
- Verifique se não há conflitos de porta

### Problemas de Compilação
- Execute `npm run build-win` com permissões de administrador
- Certifique-se de ter espaço em disco suficiente
- Verifique se o antivírus não está bloqueando o processo

## 📈 Próximas Funcionalidades

- [ ] Sincronização automática de dados
- [ ] Exportação de relatórios (PDF, Excel, CSV)
- [ ] Suporte a PostgreSQL e outros SGBDs
- [ ] Backup e restore de configurações
- [ ] Notificações de mudanças
- [ ] Agendamento de comparações
- [ ] Comparação de estruturas de tabelas
- [ ] Análise de performance
- [ ] Temas personalizáveis

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para reportar bugs ou solicitar funcionalidades, abra uma issue no repositório do projeto.

---

**Database Sync** - Facilitando a comparação e sincronização de bancos de dados MySQL! 🗄️✨ 