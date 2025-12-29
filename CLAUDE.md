# Pastelaria 24h - Sistema de Gestao de Turnos

## Visao Geral

Sistema web para gestao de turnos e vendas de uma pastelaria, desenvolvido com HTML, CSS, JavaScript vanilla e Firebase (Firestore + Realtime Database).

## Stack Tecnologica

- **Frontend**: HTML5, CSS3, JavaScript ES6+ (Modules)
- **Estilizacao**: TailwindCSS (via CDN), CSS customizado
- **Backend**: Firebase
  - **Firestore**: Usuarios, produtos, transacoes, historico de turnos
  - **Realtime Database**: Turnos ativos, produtos em tempo real, colaboradores
  - **Authentication**: Login/registro de usuarios
- **Hospedagem**: Firebase Hosting

## Estrutura do Projeto

```
pastelapp-24h/
├── index.html              # Ponto de entrada principal
├── firebase.json           # Configuracao Firebase Hosting
├── js/
│   ├── firebase-config.js  # Configuracao e funcoes Firebase (PRINCIPAL)
│   ├── main.js             # Logica principal do app
│   ├── employee/           # Modulos do funcionario
│   │   ├── dashboard.js
│   │   ├── OpenShiftModal.js
│   │   ├── CloseShiftModal.js
│   │   └── CollaboratorsCard.js
│   └── admin/              # Modulos do admin
│       ├── product-management.js
│       └── shift-corrections.js
├── views/
│   ├── auth/               # Telas de autenticacao
│   ├── employee/           # Telas do funcionario
│   │   ├── dashboard.html  # Dashboard principal (PRINCIPAL)
│   │   ├── Products.html
│   │   ├── OpenShiftModal.html
│   │   ├── CloseShiftModal.html
│   │   ├── CollaboratorsCard.html
│   │   └── CollaboratorsModalConsume.html
│   └── admin/              # Telas do admin
│       ├── dashboard.html
│       ├── products.html
│       ├── users.html
│       ├── financial.html
│       ├── reports.html
│       └── shift-corrections.html
├── css/                    # Estilos customizados
└── assets/                 # Imagens, fontes, icones
```

## Arquivos Principais

### `js/firebase-config.js`
Contem TODAS as funcoes de integracao com Firebase:
- Autenticacao (login, registro, logout)
- Gestao de usuarios (CRUD)
- Gestao de produtos (CRUD + sincronizacao RTDB)
- Gestao de turnos (abrir, fechar, vendas, sangrias)
- Gestao de colaboradores (adicionar, remover, consumo)
- Relatorios e financeiro

### `views/employee/dashboard.html`
Dashboard principal do funcionario com:
- Controle de turno (abrir/fechar)
- Vendas e sangrias
- Gestao de colaboradores
- Produtos em tempo real
- Script embutido com EmployeeController

## Banco de Dados

### Firestore Collections
- `users`: Usuarios do sistema
- `products`: Catalogo de produtos
- `transactions`: Historico financeiro
- `shifts`: Historico de turnos fechados
- `settings`: Configuracoes globais

### Realtime Database Paths
- `shifts/{shiftId}`: Turno ativo com vendas, sangrias, colaboradores
- `activeShifts/{userId}`: Referencia ao turno ativo do usuario
- `products/{productId}`: Produtos sincronizados para tempo real

## Funcionalidades por Papel

### Funcionario (staff)
- Abrir/fechar turno
- Registrar vendas
- Registrar sangrias
- Gerenciar colaboradores do turno
- Registrar consumo de colaboradores
- Ver produtos em tempo real

### Admin
- Gerenciar produtos
- Gerenciar usuarios
- Ver relatorios
- Corrigir turnos
- Gestao financeira

## Padroes de Codigo

### Imports Firebase (ES Modules via CDN)
```javascript
import { funcao } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-xxx.js';
```

### Listeners Realtime Database
```javascript
export function subscribeToXxx(callback) {
    return onValue(ref(rtdb, 'path'), (snapshot) => {
        // processar dados
        callback(dados);
    });
}
```

### Formato de Moeda
```javascript
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
```

## Configuracao Firebase

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyAFiDHRY_DuJ6pLzDmR-M2bNhzgxsX9doE",
    authDomain: "projetopastel-24h.firebaseapp.com",
    databaseURL: "https://projetopastel-24h-default-rtdb.firebaseio.com",
    projectId: "projetopastel-24h",
    storageBucket: "projetopastel-24h.firebasestorage.app",
    messagingSenderId: "348495095024",
    appId: "1:348495095024:web:edcf5a3df1ecb0e47ece35"
};
```

## Comandos Uteis

```bash
# Deploy completo (hosting + functions + rules)
firebase deploy

# Deploy apenas hosting
firebase deploy --only hosting

# Deploy apenas functions
firebase deploy --only functions

# Deploy apenas rules
firebase deploy --only firestore:rules,database

# Instalar dependencias das functions
cd functions && npm install

# Servir localmente com emuladores
firebase emulators:start

# Ver logs das functions
firebase functions:log
```

## Fluxo Principal

1. Usuario faz login
2. Redirecionado para dashboard (admin ou employee)
3. Employee: Abre turno -> Registra vendas -> Fecha turno
4. Admin: Gerencia produtos/usuarios/relatorios

## Observacoes Importantes

- Produtos sao sincronizados entre Firestore e RTDB para tempo real
- Turnos usam RTDB para atualizacoes em tempo real
- Cada turno tem seus proprios colaboradores e consumos
- Ao fechar turno, dados sao salvos no Firestore para historico
- O plano Firebase e Blaze (pay-as-you-go)

## Funcoes Firebase Principais

### Turno
- `openShift(userId, userName, initialCash, initialCoins)`
- `closeShift(shiftId, userId, closingData)`
- `getUserActiveShift(userId)`
- `subscribeToUserShift(userId, callback)`

### Vendas
- `addSaleToShift(shiftId, saleData)`
- `addWithdrawalToShift(shiftId, amount, reason)`

### Colaboradores
- `addCollaboratorToShift(shiftId, userId, userName, role)`
- `removeCollaboratorFromShift(shiftId, userId)`
- `subscribeToShiftCollaborators(shiftId, callback)`
- `addCollaboratorConsumption(shiftId, collaboratorId, consumptionData)`

### Produtos
- `subscribeToProductsRTDB(callback)` - Tempo real para employee
- `subscribeToProducts(callback)` - Firestore para admin
- `createProduct(productData)`
- `updateProduct(productId, productData)`
- `deleteProduct(productId)`
- `syncProductsToRTDB()` - Sincroniza Firestore -> RTDB

### Cloud Functions Callable
- `generateDailyReport(date)` - Gera relatorio diario
- `generateWeeklyReport()` - Gera relatorio semanal
- `syncAllProductsViaFunction()` - Sincroniza produtos via Cloud Function
- `correctShiftDivergence(shiftId, amount, reason)` - Corrige divergencia (admin)
- `calculateEmployeeCommission(userId, startDate, endDate)` - Calcula comissao

### Notificacoes
- `subscribeToNotifications(userId, callback)` - Recebe notificacoes em tempo real
- `markNotificationAsRead(notificationId)` - Marca como lida

## Cloud Functions (Backend)

### Triggers Automaticos
- `onProductCreated` - Sincroniza produto para RTDB ao criar
- `onProductUpdated` - Atualiza produto no RTDB
- `onProductDeleted` - Remove produto do RTDB
- `onShiftClosed` - Salva turno no Firestore ao fechar
- `onUserCreated` - Inicializa dados do usuario
- `checkLargeDivergence` - Alerta divergencias grandes (>R$50)

### Jobs Agendados
- `cleanupOldShifts` - Limpa turnos antigos do RTDB (24h)
- `dailyBackup` - Backup diario as 3h

### Arquivos Functions
```
functions/
├── package.json    # Dependencias Node.js
├── index.js        # Todas as Cloud Functions
└── .eslintrc.js    # Configuracao ESLint
```

## Regras de Seguranca

### Firestore (`firestore.rules`)
- Usuarios: admin CRUD, user proprio perfil
- Produtos: todos leem, admin escreve
- Turnos: staff le, sistema escreve
- Transacoes: apenas admin
- Notificacoes: usuario le proprias

### Realtime Database (`database.rules.json`)
- Produtos: todos leem, admin escreve
- Turnos: autenticado le/escreve se turno aberto
- ActiveShifts: usuario proprio ou admin
