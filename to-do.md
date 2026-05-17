# To-do Vale Muito

## Backend e dados

- [x] Criar projeto Supabase e configurar `.env.local` com as chaves reais.
- [x] Modelar migrations para `profiles`, `recommendations`, `recommendation_photos`, `tags` e `reports`.
- [x] Habilitar PostGIS/geography para busca por proximidade e mapa real.
- [x] Criar policies de RLS para leitura pública, criação por usuário logado, edição pelo autor e moderação por admin.
- [x] Substituir `src/data/seed.ts` por repository/server actions usando Supabase com fallback local.
- [x] Adicionar storage de fotos das recomendações.
- [x] Persistir tags na tabela de relacionamento do Supabase.
- [x] Adicionar comando para gerar tipos oficiais com Supabase CLI quando o projeto estiver conectado.

## Autenticação e perfis

- [x] Implementar login com Supabase Auth.
- [x] Criar perfil básico automaticamente depois do primeiro login.
- [x] Proteger criação de recomendações para usuários logados no modo Supabase.
- [x] Proteger `/admin/moderation` para usuários admin no modo Supabase.

## Recomendações

- [x] Persistir o formulário de nova recomendação no banco quando Supabase estiver configurado.
- [x] Adicionar upload de foto no formulário.
- [x] Permitir edição e remoção da própria recomendação.
- [x] Criar página de detalhe para cada recomendação.
- [x] Adicionar botão de compartilhar recomendação.
- [x] Adicionar denúncia por recomendação.

## Busca, filtros e mapa

- [x] Trocar o painel visual atual por mapa real com Leaflet.
- [x] Sincronizar marcadores do mapa com filtros e busca.
- [x] Adicionar filtro por distância quando houver localização do usuário.
- [x] Criar fluxo de endereço/coordenadas ao publicar recomendação.
- [x] Adicionar geocoding ou seleção manual no mapa.

## Moderação e segurança

- [x] Persistir denúncias no banco quando Supabase estiver configurado.
- [x] Criar ação admin real para ocultar/restaurar recomendações.
- [x] Adicionar limite básico de ações para reduzir spam em modo app.
- [x] Trocar o rate limit em memória por Redis/Upstash/Vercel KV antes de escalar produção.
- [x] Adicionar auditoria básica de ações admin.
- [x] Revisar mensagens de erro para não vazar detalhes sensíveis.
- [x] Rodar revisão de segurança antes de expor o app publicamente.

## PWA e experiência mobile

- [ ] Criar ícones reais para PWA em múltiplos tamanhos.
- [ ] Adicionar service worker/cache strategy se fizer sentido para produção.
- [ ] Testar instalação no celular.
- [ ] Refinar estados vazios, loading e erro.
- [ ] Revisar layout em telas pequenas com mapa, cards e filtros.

## Qualidade e testes

- [ ] Adicionar testes de componentes para filtros, cards e formulário.
- [ ] Adicionar testes de integração com Supabase real ou sandbox.
- [ ] Adicionar Playwright para fluxos críticos: descobrir, recomendar, denunciar e moderar.
- [ ] Manter `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` passando.
- [ ] Investigar as vulnerabilidades moderadas reportadas pelo `npm audit` sem usar `--force` automaticamente.

## Produto e lançamento

- [x] Definir a região inicial oficial do app. R: PIRACICABA/SP
- [x] Decidir se foto será obrigatória para publicar. R: NÃO OBRIGATORIO
- [x] Definir regras editoriais públicas para o que significa "vale muito". R: GASTEI PARA COMER ISSO E VALEU A PENA
- [ ] Preparar seed inicial real com recomendações confiáveis.
- [x] Configurar deploy na Vercel. R: VAI SER NA MINHA VPS, QUERO QUE SEJA DOCKER COMPOSE E NÃO FAÇA CLONE DO PROJETO TODO NA VPS
- [x] Criar checklist de lançamento beta.
