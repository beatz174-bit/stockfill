// src/components/ProductAutocomplete.tsx
import {
  Autocomplete,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useMemo, useState, useEffect } from 'react';
import { useCategories } from '../hooks/dataHooks';
import { Product } from '../models/Product';

interface ProductAutocompleteProps {
  availableProducts: Product[];
  onSelect: (product: Product) => void;
  placeholder?: string;
  onQueryChange?: (q: string) => void;
  onAddProduct?: () => void;
}

export const ProductAutocomplete = ({
  availableProducts,
  onSelect,
  placeholder = 'Search products',
  onQueryChange,
  onAddProduct,
}: ProductAutocompleteProps) => {
  const categories = useCategories();
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState('');

  // When a product is chosen, call onSelect and clear the selection.
  useEffect(() => {
    if (!selectedProduct) return;
    onSelect(selectedProduct);
    setSelectedProduct(null);
    setQuery('');
    if (onQueryChange) onQueryChange('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

  // If the availableProducts change such that the selectedProduct is no longer available, clear it
  useEffect(() => {
    if (!selectedProduct) return;
    if (!availableProducts.some((p) => p.id === selectedProduct.id)) {
      setSelectedProduct(null);
    }
  }, [availableProducts, selectedProduct]);

  return (
    <Autocomplete
      options={availableProducts}
      getOptionLabel={(option) =>
        `${option.name} (${categoriesById.get(option.category) ?? option.category ?? ''})`
      }
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={selectedProduct}
      onChange={(_, value) => setSelectedProduct(value ?? null)}
      inputValue={query}
      onInputChange={(_, value, reason) => {
        if (reason === 'input') {
          setQuery(value);
          if (onQueryChange) onQueryChange(value);
        }
        if (reason === 'clear') {
          setQuery('');
          if (onQueryChange) onQueryChange('');
        }
      }}
      filterOptions={(options) => options}
      noOptionsText="No available products"
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          /* Add accessible name and stable test id */
          inputProps={{
            ...params.inputProps,
            'aria-label': placeholder,
            'data-testid': 'product-search-input',
          }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
                {params.InputProps?.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {params.InputProps?.endAdornment}
                <InputAdornment position="end" sx={{ gap: 0.5 }}>
                  <Tooltip title="Clear search">
                    <span>
                      <IconButton
                        aria-label="Clear"
                        size="small"
                        onClick={() => {
                          setQuery('');
                          if (onQueryChange) onQueryChange('');
                        }}
                        disabled={query.length === 0}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Add a new product">
                    <span>
                      <IconButton
                        aria-label="Add product"
                        size="small"
                        onClick={onAddProduct}
                        disabled={!onAddProduct}
                      >
                        <AddCircleOutlineIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              </>
            ),
          }}
        />
      )}
    />
  );
};
