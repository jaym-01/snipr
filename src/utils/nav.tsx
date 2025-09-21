import { createContext, useContext, useState } from "react";
import UploadFilePage from "../components/UploadFile.tsx";

const WINDOW_MAPPING = {
  upload: <UploadFilePage />,
};

const DEFAULT_PAGE: keyof typeof WINDOW_MAPPING = "upload";

export const NavContext = createContext<
  (page: keyof typeof WINDOW_MAPPING) => void
>(() => {});

export function CurrentPage() {
  const [currentPage, setCurrentPage] =
    useState<keyof typeof WINDOW_MAPPING>(DEFAULT_PAGE);

  return (
    <NavContext.Provider value={setCurrentPage}>
      {WINDOW_MAPPING[currentPage]}
    </NavContext.Provider>
  );
}

export function useGoToPage() {
  return useContext(NavContext);
}
