# Guia de Deploy - Deck Gantt (Nextcloud AIO)

Este roteiro é específico para sua infraestrutura utilizando o **Nextcloud All-in-One (AIO)**.
Todos os comandos devem ser executados no terminal do host (servidor onde o Docker roda).

## 1. Identificar o Container

No Nextcloud AIO, o container real da aplicação é o `nextcloud-aio-nextcloud`.

## 2. Instalação Inicial

Se ainda não instalou:

```bash
# 1. Clone
docker exec --user root nextcloud-aio-nextcloud git clone https://github.com/fguernieri/nxc_gantt.git /var/www/html/custom_apps/nxc_gantt

# 2. Configurar Git (Safe Directory) - OBRIGATÓRIO
docker exec --user root nextcloud-aio-nextcloud git config --global --add safe.directory /var/www/html/custom_apps/nxc_gantt

# 3. Permissões
docker exec --user root nextcloud-aio-nextcloud chown -R www-data:www-data /var/www/html/custom_apps/nxc_gantt

# 4. Config (Liberar app não assinado)
docker exec --user www-data nextcloud-aio-nextcloud php occ config:system:set app_install_overwrite 0 --value="nxc_gantt"

# 5. Enable
docker exec --user www-data nextcloud-aio-nextcloud php occ app:enable nxc_gantt
```

---

## 3. Roteiro de Atualização (Deploy Contínuo)

Quando você fizer atualizações no GitHub, rode **exatamente** esta sequência de comandos.

O erro `dubious ownership` acontece porque clonamos como `root`, mas o dono da pasta é `www-data`. Para corrigir isso temporariamente durante o pull, precisamos configurar o diretório como seguro.

```bash
# 1. Adicionar exceção de segurança ao Git (para permitir que root mexa na pasta do www-data)
docker exec --user root nextcloud-aio-nextcloud git config --global --add safe.directory /var/www/html/custom_apps/nxc_gantt

# 2. Puxar alterações (Git Pull)
docker exec --user root nextcloud-aio-nextcloud git -C /var/www/html/custom_apps/nxc_gantt pull

# 3. Restaurar Permissões (Crítico: devolve a posse para o Apache funcionar)
docker exec --user root nextcloud-aio-nextcloud chown -R www-data:www-data /var/www/html/custom_apps/nxc_gantt
```

### Se der erro de merge ou arquivos locais modificados:

Se você mexeu em algo manualmente no servidor e o git reclamar, force o reset para ficar igual ao GitHub:

```bash
docker exec --user root nextcloud-aio-nextcloud git -C /var/www/html/custom_apps/nxc_gantt fetch --all
docker exec --user root nextcloud-aio-nextcloud git -C /var/www/html/custom_apps/nxc_gantt reset --hard origin/main
docker exec --user root nextcloud-aio-nextcloud chown -R www-data:www-data /var/www/html/custom_apps/nxc_gantt
```
