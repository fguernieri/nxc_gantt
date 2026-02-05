# Guia de Deploy - Deck Gantt (Docker)

Este guia explica como instalar o aplicativo "Deck Gantt" em uma instância Nextcloud rodando em **Docker**.

## 1. Gerar o Build de Produção

Primeiro, na sua máquina de desenvolvimento (onde está este código), gere os arquivos estáticos otimizados:

```bash
npm install
npm run build
```

## 2. Preparar os Arquivos

Crie uma estrutura limpa contendo apenas os arquivos necessários para o Nextcloud. Você pode fazer isso criando uma pasta temporária `dist_app`:

```bash
# Criar pasta temporária
mkdir dist_app

# Copiar pastas essenciais
cp -r appinfo css img js lib templates dist_app/
```

## 3. Instalação no Container Docker

Existem duas formas principais de instalar, dependendo de como você gerencia seu Docker.

### Método A: Copiar arquivos para container rodando (Mais rápido para teste)

Se seu container se chama `nextcloud-app`:

1.  Copie a pasta para dentro do diretório de apps do container:
    ```bash
    docker cp dist_app/. nextcloud-app:/var/www/html/custom_apps/nxc_gantt
    ```
    *(Nota: Se você usa o caminho padrão `/var/www/html/apps` e não `custom_apps`, ajuste o comando. Verifique onde seus apps estão instalados).*

2.  Ajuste as permissões dentro do container:
    ```bash
    docker exec -it nextcloud-app chown -R www-data:www-data /var/www/html/custom_apps/nxc_gantt
    ```

### Método B: Usando Volumes (Persistente / Recomendado)

Se você mapeia a pasta de apps no seu `docker-compose.yml`, por exemplo:

```yaml
services:
  app:
    image: nextcloud
    volumes:
      - ./nextcloud-data/apps:/var/www/html/custom_apps
```

Basta copiar a pasta `dist_app` (renomeada para `nxc_gantt`) para dentro da sua pasta local `./nextcloud-data/apps/`.

## 4. Configuração de Permissão (App não assinado)

Como o app não é assinado digitalmente, o Nextcloud bloqueará a ativação por padrão. Em Docker, a maneira mais fácil de resolver isso é via variável de ambiente ou comando `occ`.

### Opção 1: Variável de Ambiente (Docker Compose)

Adicione ao seu `docker-compose.yml` na seção `environment`:

```yaml
environment:
  - NEXTCLOUD_ADDITIONAL_APPRES=nxc_gantt
```
*(Nota: verifique se sua imagem Docker suporta essa variável específica, imagens oficiais ou da Linuxserver podem variar).*

### Opção 2: Comando OCC (Universal para Docker)

Rode o comando diretamente no container para autorizar o app:

```bash
docker exec -u www-data nextcloud-app php occ config:system:set app_install_overwrite 0 --value="nxc_gantt"
```

*Se já houver outros apps, use índices diferentes (1, 2...) ou adicione manualmente ao config.php.*

## 5. Ativação Final

1.  Acesse seu Nextcloud no navegador.
2.  Vá em **Apps** (clique no ícone do perfil > Aplicativos).
3.  Vá em **Seus aplicativos** (Your apps).
4.  Encontre **Deck Gantt** e clique em **Ativar** (Enable).

## Resumo de Comandos Rápidos

```powershell
# 1. Build
npm run build

# 2. Copiar para container (Exemplo Windows PowerShell)
# Certifique-se de estar na raiz do projeto
docker cp appinfo nextcloud_server:/var/www/html/custom_apps/nxc_gantt/
docker cp css nextcloud_server:/var/www/html/custom_apps/nxc_gantt/
docker cp img nextcloud_server:/var/www/html/custom_apps/nxc_gantt/
docker cp js nextcloud_server:/var/www/html/custom_apps/nxc_gantt/
docker cp lib nextcloud_server:/var/www/html/custom_apps/nxc_gantt/
docker cp templates nextcloud_server:/var/www/html/custom_apps/nxc_gantt/

# 3. Permissões e Config
docker exec -u www-data nextcloud_server php occ config:system:set app_install_overwrite 0 --value="nxc_gantt"
docker exec nextcloud_server chown -R www-data:www-data /var/www/html/custom_apps/nxc_gantt
```
