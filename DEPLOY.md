# Guia de Deploy - Deck Gantt (nxc_gantt)

Este guia explica como instalar o aplicativo "Deck Gantt" em um ambiente Nextcloud de produção.

## 1. Pré-requisitos

*   Acesso ao servidor Nextcloud (via SSH/FTP).
*   Permissões de escrita na pasta `apps/` ou `custom_apps/` do Nextcloud.
*   Node.js instalado (apenas para gerar o build se não for copiar os arquivos já gerados).

## 2. Gerar o Build de Produção

Antes de copiar os arquivos, certifique-se de que o frontend está compilado para produção.
Na raiz do projeto (sua máquina local), execute:

```bash
npm install
npm run build
```

Isso atualizará as pastas `js/` e `css/` com a versão mais recente do código.

## 3. Preparar o Pacote

Para o Nextcloud, você precisa copiar **apenas** as pastas essenciais. A estrutura final no servidor deve ficar assim:

```text
nextcloud/
└── apps/
    └── nxc_gantt/
        ├── appinfo/
        ├── css/
        ├── img/
        ├── js/
        ├── lib/
        └── templates/
```

**NÃO COPIE**: `node_modules`, `src`, `.git`, `package.json`, `vite.config.js`, `index.html`. Estes são apenas para desenvolvimento.

## 4. Instalação Manual (Upload)

1.  Acesse a pasta de aplicativos do seu Nextcloud (geralmente `/var/www/nextcloud/apps` ou `/var/www/nextcloud/custom_apps`).
2.  Crie a pasta `nxc_gantt`.
3.  Faça o upload do conteúdo das pastas listadas acima (`appinfo`, `css`, `js`, `lib`, `templates`, `img`).
4.  Garanta que o usuário do servidor web (ex: `www-data`) é o dono dos arquivos:
    ```bash
    chown -R www-data:www-data /var/www/nextcloud/apps/nxc_gantt
    ```

## 5. Ativação

1.  Acesse o Nextcloud como Administrador.
2.  Vá em **Configurações > Aplicativos**.
3.  Procure por "Deck Gantt" (provavelmente na aba "Seus aplicativos" ou "Desativados").
4.  Clique em **Ativar**.

### Problema Comum: "Assinatura Ausente"

Como este é um app desenvolvido internamente e não publicado na Nextcloud App Store, ele não tem uma assinatura digital criptográfica. O Nextcloud bloqueia a instalação por padrão.

Para permitir a instalação, você tem duas opções:

**Opção A (Recomendada para dev/interno): Editar `config.php`**
1.  Edite o arquivo de configuração do Nextcloud (`/var/www/nextcloud/config/config.php`).
2.  Adicione o ID do app na lista de apps permitidos sem assinatura:

```php
'allow_local_remote_servers' => true,
'app_install_overwrite' => [
    'nxc_gantt',
],
```

**Opção B: Via comando `occ`**
Se você tem acesso ao terminal do servidor:

```bash
sudo -u www-data php /var/www/nextcloud/occ config:system:set app_install_overwrite 0 --value="nxc_gantt"
```
*(Nota: se já houver outros apps nessa lista, esse comando pode sobrescrevê-los, use com cuidado ou use a edição manual do arquivo)*.

## 6. Integração Real (Próximos Passos)

Atualmente, o app usa **dados fictícios** (mock data) no arquivo `App.vue`. Para usar os dados reais do Deck:

1.  Você precisará editar o `src/App.vue`.
2.  Substituir a variável `tasks` por uma chamada à API do Deck.
    *   Endpoint do Deck: `/index.php/apps/deck/api/v1.0/boards/{boardId}/stacks`
3.  Recompilar (`npm run build`) e atualizar os arquivos `js/` no servidor.
