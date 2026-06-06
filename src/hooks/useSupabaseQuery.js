import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import db from '@/lib/db';

/**
 * Hook para consultar uma lista de entidades com filtros opcionais
 * @param {string} entityName - Nome da entidade no db.entities
 * @param {Object} filters - Filtros a serem aplicados na consulta
 * @param {Object} options - Opções adicionais (order, limit, enabled)
 */
export function useEntityQuery(entityName, filters = {}, options = {}) {
  const { order, limit, enabled = true, ...queryOptions } = options;

  return useQuery({
    queryKey: [entityName, JSON.stringify(filters), order, limit],
    queryFn: () => db.entities[entityName].filter(filters, order, limit),
    enabled,
    ...queryOptions,
  });
}

/**
 * Hook para buscar uma entidade específica pelo ID
 * @param {string} entityName - Nome da entidade no db.entities
 * @param {string} id - ID da entidade
 * @param {Object} options - Opções adicionais do useQuery
 */
export function useEntityGet(entityName, id, options = {}) {
  const { enabled = true, ...queryOptions } = options;

  return useQuery({
    queryKey: [entityName, id],
    queryFn: () => db.entities[entityName].get(id),
    enabled: enabled && !!id,
    ...queryOptions,
  });
}

/**
 * Hook genérico de mutação para entidades (create, update, delete)
 * @param {string} entityName - Nome da entidade no db.entities
 * @param {'create'|'update'|'delete'} operation - Tipo de operação
 */
export function useEntityMutation(entityName, operation) {
  const queryClient = useQueryClient();

  const mutationFns = {
    create: (data) => db.entities[entityName].create(data),
    update: ({ id, data }) => db.entities[entityName].update(id, data),
    delete: (id) => db.entities[entityName].delete(id),
  };

  return useMutation({
    mutationFn: mutationFns[operation],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityName] });
    },
  });
}

/**
 * Hook de conveniência para criar uma entidade
 * @param {string} entityName - Nome da entidade
 */
export function useEntityCreate(entityName) {
  return useEntityMutation(entityName, 'create');
}

/**
 * Hook de conveniência para atualizar uma entidade
 * @param {string} entityName - Nome da entidade
 */
export function useEntityUpdate(entityName) {
  return useEntityMutation(entityName, 'update');
}

/**
 * Hook de conveniência para deletar uma entidade
 * @param {string} entityName - Nome da entidade
 */
export function useEntityDelete(entityName) {
  return useEntityMutation(entityName, 'delete');
}
