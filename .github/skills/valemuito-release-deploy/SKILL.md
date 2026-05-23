---
name: valemuito-release-deploy
description: 'Publicar releases do Vale Muito com segurança. Use quando precisar validar mudanças para release, fazer commit e push, criar tag v1.x.y, verificar a workflow release-image.yml, confirmar imagem no GHCR, disparar workflow_dispatch, e deployar uma tag na VPS com verificações pós-release.'
argument-hint: 'release <tag> | tag <tag> | workflow | deploy <tag> | verify'
user-invocable: true
---

# Vale Muito Release Deploy

Skill especializada no fluxo de release e deploy do Vale Muito.

## Quando usar

- Preparar uma mudança para produção.
- Validar um release candidate antes de commitar.
- Fazer commit, push e criar uma nova tag semântica.
- Confirmar se a tag acionou a workflow `.github/workflows/release-image.yml`.
- Monitorar a build da imagem no GHCR.
- Disparar `workflow_dispatch` quando necessário.
- Fazer deploy de uma tag publicada para a VPS.
- Confirmar se a produção está rodando a revisão esperada.

## Guardrails

- Nunca incluir arquivos de debug, screenshots, artefatos de Playwright, ou scripts temporários em commits/tag de release.
- Nunca imprimir tokens, senhas, chaves, ou conteúdo de `.env.production`.
- Nunca assumir que `push` em `main` gera imagem automaticamente.
- Antes de taggear, validar o slice alterado com checks executáveis.
- Antes de deployar na VPS, garantir que a imagem da tag já existe e a workflow terminou com sucesso.
- Nunca alterar Nginx nesse fluxo sem pedido explícito do usuário.

## Fatos do projeto

- Workflow de imagem: `.github/workflows/release-image.yml`
- GHCR image: `ghcr.io/cheri-hub/vale-muito`
- Projeto Compose na VPS: `valemuito`
- Host SSH: `vps`
- Remote dir: `/opt/valemuito`
- Env remoto: `/opt/valemuito/shared/.env.production`
- Deploy script: `./vps/deploy.ps1`

## Regras da pipeline

`release-image.yml` roda quando:

- uma tag `v*` é enviada
- uma GitHub Release é publicada
- `workflow_dispatch` é disparado manualmente

Consequência importante:

- `push` normal em `main` nao basta para publicar imagem, a menos que haja disparo manual da workflow

## Fluxo padrão de release

1. Inspecionar o diff e confirmar que só há mudanças intencionais.
2. Rodar validação proporcional ao slice alterado:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
3. Fazer commit em `main` só com os arquivos corretos.
4. Fazer push do commit.
5. Descobrir a última tag existente:
   - `git tag --sort=-v:refname`
6. Criar a próxima tag semântica, por exemplo `v1.0.5`.
7. Fazer push da tag.
8. Verificar se a workflow da tag apareceu e monitorar até `success`.
9. Só então deployar a tag na VPS.
10. Validar revisão OCI, health e comportamento público.

## Fluxo de workflow de imagem

1. Verificar runs recentes da workflow `.github/workflows/release-image.yml`.
2. Confirmar:
   - `event`
   - `head_sha`
   - `status`
   - `conclusion`
3. Se não houver run para a revisão esperada, disparar `workflow_dispatch`.
4. Em ambientes sem `gh`, usar GitHub REST API.
5. Se usar credenciais locais do Git, tratar qualquer token recuperado como secreto e nunca expor no terminal ou resposta.

## Fluxo de deploy por tag

1. Confirmar que a tag esperada foi publicada com sucesso no GHCR.
2. Rodar:
   - `./vps/deploy.ps1 -ImageTag <tag>`
3. Validar na VPS:
   - `current` aponta para o release novo
   - `docker compose config` passa
   - `docker compose ps` mostra `valemuito-app` saudável
   - `docker inspect valemuito-app` mostra `org.opencontainers.image.revision` correto
   - `curl http://127.0.0.1:3008/` responde
4. Se necessário, validar também a URL pública:
   - `https://vale-muito.cherihub.cloud`

## Fluxo de verificação pós-release

Após deploy:

1. Conferir a revisão OCI da imagem em execução.
2. Conferir se a tag ou SHA batem com o commit esperado.
3. Reproduzir a feature corrigida em produção.
4. Se for fluxo frontend, preferir Playwright para validar a URL pública.
5. Se houver falha, distinguir:
   - deploy não aplicado
   - imagem errada
   - env/config externa
   - bug de aplicação

## Casos comuns

### Push em `main` sem imagem nova

- Verificar gatilhos da workflow
- Criar tag `v*` ou usar `workflow_dispatch`

### VPS está saudável mas comportamento antigo continua

- Conferir `org.opencontainers.image.revision`
- Conferir qual tag/sha está rodando
- Confirmar que o release novo foi realmente deployado

### Tag gerou imagem mas produção não mudou

- A pipeline de imagem não faz deploy automático por si só
- É preciso rodar `./vps/deploy.ps1 -ImageTag <tag>` ou equivalente

## Checklist final

- Commit e push feitos com o diff correto.
- Tag criada e enviada.
- Workflow de imagem concluída com `success`.
- Imagem da tag disponível.
- Deploy aplicado na VPS.
- `valemuito-app` saudável.
- Revisão OCI bate com a tag/commit esperado.
- Nenhum segredo exposto durante o processo.
