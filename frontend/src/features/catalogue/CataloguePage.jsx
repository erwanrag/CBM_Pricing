// 📁 src/features/catalogue/CataloguePage.jsx
import React, { useState } from "react";
import PageWrapper from "@/shared/components/page/PageWrapper";
import PageTitle from "@/shared/components/page/PageTitle";
import CatalogueFilters from "./components/CatalogueFilters";
import CatalogueTable from "./components/CatalogueTable";
import useDebounce from "@/hooks/useDebounce";
import ErrorBoundary from "@/shared/components/error/ErrorBoundary";

export default function CataloguePage() {
  const [filterModel, setFilterModel] = useState({ items: [] });
  const debouncedFilters = useDebounce(filterModel, 300);

  return (
    <PageWrapper>
      <PageTitle>📋 Catalogue Tarifaire</PageTitle>
      <CatalogueFilters value={filterModel} onChange={setFilterModel} />

      <ErrorBoundary fallback={<div>Erreur lors du chargement du catalogue.</div>}>
        <CatalogueTable filters={debouncedFilters} />
      </ErrorBoundary>
    </PageWrapper>
  );
}
