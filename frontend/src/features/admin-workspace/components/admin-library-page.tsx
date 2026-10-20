import { useQueryClient } from '@tanstack/react-query';
import {
  getWorkoutTemplatesListQueryKey,
  useWorkoutTemplatesList,
  useWorkoutTemplatesUpdateLibraryPublication,
} from '@/generated/workout-templates/workout-templates';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import {
  AdminPageScaffold,
  AdminSurface,
} from '@/features/admin-workspace/components/admin-primitives';

const templatesQuery = { page: 1, limit: 100, status: 'ACTIVE' } as const;

export function AdminLibraryPage() {
  const client = useQueryClient();
  const copy = useAdminWorkspaceCopy();
  const templates = useWorkoutTemplatesList(templatesQuery);
  const update = useWorkoutTemplatesUpdateLibraryPublication({
    mutation: {
      onSuccess: () =>
        void client.invalidateQueries({
          queryKey: getWorkoutTemplatesListQueryKey(templatesQuery),
        }),
    },
  });

  return (
    <AdminPageScaffold title={copy.library.title} description={copy.library.description}>
      <AdminSurface>
        <div className="space-y-3">
          {(templates.data?.data ?? []).map((template) => {
            const inputId = `library-publication-${template.id}`;

            return (
              <div
                key={template.id}
                className="flex min-h-12 items-center justify-between gap-4 border-b py-3"
              >
                <span className="font-medium">{template.name}</span>
                <div className="flex items-center gap-2">
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={template.isLibraryPublished}
                    disabled={update.isPending}
                    onChange={(event) =>
                      update.mutate({
                        id: template.id,
                        data: { published: event.target.checked },
                      })
                    }
                  />
                  <label htmlFor={inputId} className="text-sm text-muted-foreground">
                    {copy.library.publishedNamed(template.name)}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </AdminSurface>
    </AdminPageScaffold>
  );
}
