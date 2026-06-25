import { jobTitlesApi } from '@/lib/api/job-titles';
import { HrCatalogPage } from '@/components/hr/HrCatalogPage';

export function JobTitlesPage() {
  return (
    <HrCatalogPage
      activeTab="job-titles"
      titleKey="jobTitles.title"
      descKey="jobTitles.desc"
      addKey="jobTitles.add"
      emptyKey="jobTitles.empty"
      load={() => jobTitlesApi.list()}
      create={(b) => jobTitlesApi.create(b)}
      update={(id, b) => jobTitlesApi.update(id, b)}
      remove={(id) => jobTitlesApi.remove(id)}
    />
  );
}
