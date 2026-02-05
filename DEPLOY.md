# Guia de Deploy - Deck Gantt (Nextcloud AIO)

Este roteiro é específico para sua infraestrutura utilizando o **Nextcloud All-in-One (AIO)**.
Todos os comandos devem ser executados no terminal do host (servidor onde o Docker roda).

## 1. Identificar o Container

No Nextcloud AIO, o container que roda o servidor web e PHP se chama **`nextcloud-aio-nextcloud`**.

*(Nota: Embora seu compose mostre `nextcloud-aio-mastercontainer`, ele é o orquestrador que cria os outros. O container real da aplicação é o `nextcloud-aio-nextcloud`).*

Você pode verificar se ele está rodando com:
```bash
docker ps --filter "name=nextcloud-aio-nextcloud"
```

## 2. Instalação via Git (Direto no Host)

Vamos clonar o repositório diretamente para dentro do container usando comandos executados do host.

### Passo 2.1: Entrar na pasta de Apps
Vamos usar `docker exec` para rodar o git dentro do container.

Primeiro, clone/baixe o app:
```bash
docker exec -it --user root nextcloud-aio-nextcloud git clone https://github.com/fguernieri/nxc_gantt.git /var/www/html/custom_apps/nxc_gantt
```

### Passo 2.2: Ajustar Permissões
Garanta que o usuário `www-data` é dono dos arquivos para que o Nextcloud possa ler e executar.

```bash
docker exec -t --user root nextcloud-aio-nextcloud chown -R www-data:www-data /var/www/html/custom_apps/nxc_gantt
```

## 3. Permitir App Não Assinado

O Nextcloud bloqueia apps manuais. Use este comando para liberar o `nxc_gantt`.

```bash
docker exec --user www-data nextcloud-aio-nextcloud php occ config:system:set app_install_overwrite 0 --value="nxc_gantt"
```

*Se você já tiver liberado outros apps antes, esse comando pode sobrescrever a lista. Se for o caso, me avise para te passar o comando de append.*

## 4. Ativar o App

Agora o app já deve aparecer na lista. Você pode ativar via linha de comando para ser mais rápido:

```bash
docker exec --user www-data nextcloud-aio-nextcloud php occ app:enable nxc_gantt
```

Se tudo der certo, ele responderá algo como: `nxc_gantt enabled`.

---

## 5. Roteiro de Atualização (Deploy Contínuo)

Quando você fizer alterações e enviar para o GitHub, rode estes 3 comandos no servidor para atualizar:

```bash
# 1. Puxar alterações (Git Pull)
docker exec --user root nextcloud-aio-nextcloud git -C /var/www/html/custom_apps/nxc_gantt pull

# 2. Garantir permissões (por segurança)
docker exec --user root nextcloud-aio-nextcloud chown -R www-data:www-data /var/www/html/custom_apps/nxc_gantt

# 3. Limpar cache de JS/CSS (opcional, se notar que não atualizou no browser)
# docker exec --user www-data nextcloud-aio-nextcloud php occ maintenance:repair
```

## Resumão (Copie e Cole)

Roteiro completo de instalação do zero:

```bash
# 1. Clone
docker exec --user root nextcloud-aio-nextcloud git clone https://github.com/fguernieri/nxc_gantt.git /var/www/html/custom_apps/nxc_gantt

# 2. Permissões
docker exec --user root nextcloud-aio-nextcloud chown -R www-data:www-data /var/www/html/custom_apps/nxc_gantt

# 3. Config (Unsigned)
docker exec --user www-data nextcloud-aio-nextcloud php occ config:system:set app_install_overwrite 0 --value="nxc_gantt"

# 4. Enable
docker exec --user www-data nextcloud-aio-nextcloud php occ app:enable nxc_gantt
```
