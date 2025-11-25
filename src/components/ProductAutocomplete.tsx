import {
  Autocomplete,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { useCategories } from '../hooks/dataHooks';
import { Product } from '../models/Product';

interface ProductAutocompleteProps {
  availableProducts: Product[];
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export const ProductAutocomplete = ({
  availableProducts,
  onSelect,
  placeholder = 'Search products',
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
        if (reason === 'input') setQuery(value);
        if (reason === 'clear') setQuery('');
      }}
      filterOptions={(options) => options}
      noOptionsText="No available products"
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {params.InputProps.endAdornment}
                <InputAdornment position="end">
                  <Tooltip title="Add a new product">
                    <IconButton aria-label="Add product" component={RouterLink} to="/products" size="small">
                      <AddCircleOutlineIcon />
                    </IconButton>
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
