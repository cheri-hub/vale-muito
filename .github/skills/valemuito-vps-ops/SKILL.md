---
name: valemuito-vps-ops
description: 'Operar a VPS do Vale Muito com segurança. Use quando precisar fazer ssh vps, validar /opt/valemuito/current, conferir docker compose, checar health do container, deployar imagem GHCR por tag, limpar releases, verificar envs sem expor segredos, investigar produção, ou fazer rollback do projeto valemuito.'
argument-hint: 'inspect | deploy <tag> | cleanup | rollback <release> | debug | health'
user-invocable: true
---

# Vale Muito VPS Ops

Skill especializada para os processos operacionais da VPS do Vale Muito.

## Quando usar

- Fazer `ssh vps` para inspecionar produção.
- Validar o estado de `/opt/valemuito/current`.
- Conferir qual imagem GHCR está rodando.
- Verificar `docker compose`, saúde do container e loopback `127.0.0.1:3008`.
- Fazer deploy de uma tag publicada no GHCR.
- Limpar releases e deixar o diretório ativo só com os arquivos mínimos de runtime.
- Conferir envs de produção sem imprimir segredos.
- Depurar problemas de produção que envolvam container, env, Google Places, Supabase ou health check.
- Fazer rollback para um release anterior.

## Guardrails

- Sempre assuma que o alvo é o alias SSH `vps`.
- Limite mudanças ao projeto `valemuito` em `/opt/valemuito`.
- Nunca imprimir segredos, tokens, chaves, ou valores de `.env.production`.
- Nunca editar ou recarregar Nginx sem pedido explícito do usuário.
- Nunca parar, podar ou alterar projetos Docker que não sejam o Compose project `valemuito`.
- Preservar `/opt/valemuito/shared/.env.production` durante limpezas e deploys.
- Em limpeza de release ativo, manter no diretório apontado por `current` apenas:
  - `docker-compose.prod.yml`
  - `docker-compose.yml`
  - `.deployed-image-ref`
- Após qualquer mudança operacional, validar `docker compose config`, `docker compose ps` e saúde do container.

## Constantes do projeto

- SSH target: `vps`
- Remote dir: `/opt/valemuito`
- Shared env: `/opt/valemuito/shared/.env.production`
- Current symlink: `/opt/valemuito/current`
- Compose project: `valemuito`
- Container name: `valemuito-app`
- Loopback port: `127.0.0.1:3008`
- Public URL: `https://vale-muito.cherihub.cloud`
- Image base: `ghcr.io/cheri-hub/vale-muito`

## Fluxo de inspeção

1. Resolver o release ativo:
   - `ssh vps "realpath /opt/valemuito/current"`
2. Listar conteúdo atual sem expor segredos:
   - `ssh vps "ls -la /opt/valemuito/current && ls -la /opt/valemuito/shared"`
3. Validar Compose:
   - `ssh vps "docker compose -f /opt/valemuito/current/docker-compose.prod.yml --env-file /opt/valemuito/shared/.env.production config --quiet"`
4. Validar runtime:
   - `ssh vps "docker compose -p valemuito -f /opt/valemuito/current/docker-compose.prod.yml --env-file /opt/valemuito/shared/.env.production ps"`
   - `ssh vps "curl -fsS http://127.0.0.1:3008/ >/dev/null && echo ok"`
5. Conferir imagem e labels da aplicação:
   - `ssh vps "docker inspect valemuito-app --format '{{json .Config.Labels}}'"`

## Fluxo de deploy por tag

1. Confirmar que a tag já gerou imagem no GHCR.
2. Rodar localmente:
   - `./vps/deploy.ps1 -ImageTag <tag>`
3. Após deploy, validar:
   - release ativo
   - compose config
   - container saudável
   - loopback local respondendo
   - revisão OCI da imagem batendo com a tag ou SHA esperado

## Fluxo de limpeza do release ativo

Use quando o deploy já é image-based e o release ainda contém código-fonte/copias desnecessárias.

1. Resolver target real de `current`.
2. Confirmar que existe `.deployed-image-ref` ou `docker-compose.prod.yml`.
3. Remover do release ativo tudo o que não for runtime-only.
4. Manter somente:
   - `docker-compose.prod.yml`
   - `docker-compose.yml`
   - `.deployed-image-ref`
5. Validar novamente `docker compose config` e `ps`.

## Fluxo de rollback

1. Listar releases:
   - `ssh vps "ls -1 /opt/valemuito/releases"`
2. Conferir imagem associada:
   - `ssh vps "cat /opt/valemuito/releases/<release>/.deployed-image-ref"`
3. Reapontar `current` para o release desejado.
4. Subir apenas o projeto `valemuito` usando o `VALEMUITO_IMAGE` salvo no release.
5. Validar health e loopback.

## Fluxo de debug em produção

Para problemas de funcionalidade:

1. Verificar se a revisão em execução bate com o commit/tag esperado.
2. Confirmar presença dos nomes das envs, nunca os valores.
3. Testar dependências externas do servidor usando o mesmo caminho real do app:
   - Supabase
   - Google Places API (New)
   - GHCR image pull
4. Quando a feature roda no servidor, não esperar chamadas no browser.
5. Distinguir entre:
   - bug de frontend
   - gate de autenticação
   - env ausente
   - API externa desabilitada ou restrita

## Checklist final

- `current` aponta para o release certo.
- `docker compose config` passa.
- `valemuito-app` está `healthy`.
- `curl http://127.0.0.1:3008/` responde.
- Nenhum segredo foi impresso.
- Nenhum projeto Docker externo foi tocado.
- Nginx permaneceu intacto, salvo instrução explícita do usuário.
