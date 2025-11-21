import { Card, CardContent, Stack, Typography } from '@mui/material';
import { Product } from '../models/Product';

interface ProductRowProps {
  product: Product;
}

export const ProductRow = ({ product }: ProductRowProps) => (
  <Card variant="outlined" sx={{ mb: 1 }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="subtitle1">{product.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {product.category} • {product.unit_type}
          </Typography>
        </div>
        {product.bulk_name && product.units_per_bulk ? (
          <Typography variant="caption" color="text.secondary">
            {product.units_per_bulk} per {product.bulk_name}
          </Typography>
        ) : null}
      </Stack>
    </CardContent>
  </Card>
);
