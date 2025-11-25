import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { liveQuery } from 'dexie';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScannerView } from '../components/BarcodeScannerView';
import { useDatabase } from '../context/DBProvider';
import { Area } from '../models/Area';
import { PickList } from '../models/PickList';
import { Product } from '../models/Product';

interface ProductLookup {
  product?: Product | null;
  pickLists: { list: PickList; area?: Area }[];
}

const BarcodeScannerScreen = () => {
  const db = useDatabase();
  const navigate = useNavigate();
  const [lastCode, setLastCode] = useState('');
  const [lookup, setLookup] = useState<ProductLookup>({ pickLists: [] });
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!lastCode) {
      setLookup({ pickLists: [] });
      return undefined;
    }

    const subscription = liveQuery(async () => {
      const product = await db.products.where('barcode').equals(lastCode).first();

      if (!product) {
        return { product: null, pickLists: [] } satisfies ProductLookup;
      }

      const pickItems = await db.pickItems.where('product_id').equals(product.id).toArray();
      const pickListIds = Array.from(new Set(pickItems.map((item) => item.pick_list_id)));
      const pickLists = (await db.pickLists.bulkGet(pickListIds)).filter(
        (list): list is PickList => Boolean(list),
      );
      const areas = await db.areas.bulkGet(pickLists.map((list) => list.area_id));
      const areaMap = new Map<string, Area>();
      areas.forEach((area) => {
        if (area) areaMap.set(area.id, area);
      });

      return {
        product,
        pickLists: pickLists.map((list) => ({ list, area: areaMap.get(list.area_id) })),
      } satisfies ProductLookup;
    }).subscribe({
      next: setLookup,
    });

    return () => subscription.unsubscribe();
  }, [db, lastCode]);

  const hasProduct = useMemo(() => lookup.product && lookup.product !== null, [lookup.product]);

  const handleDetected = (code: string) => {
    setLastCode(code);
    setScannerOpen(false);
  };

  const handleAddProduct = () => {
    if (!lastCode) return;
    navigate('/products', { state: { newBarcode: lastCode } });
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Barcode Scanner
      </Typography>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack spacing={0.25}>
                <Typography variant="subtitle1">Scan barcodes</Typography>
                <Typography variant="body2" color="text.secondary">
                  Open the camera in a popup to keep scanned details easy to read.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="contained" onClick={() => setScannerOpen(true)}>
                  Scan barcode
                </Button>
                {lastCode ? (
                  <Button variant="outlined" onClick={() => setScannerOpen(true)}>
                    Scan another
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {lastCode ? (
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography variant="subtitle1">Last detected</Typography>
                <Chip
                  color={hasProduct ? 'success' : 'default'}
                  label={hasProduct ? 'Product found' : 'Not linked to a product'}
                  size="small"
                />
              </Stack>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {lastCode}
              </Typography>
              {lookup.product === null ? (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      This barcode is not present in the product list.
                    </Typography>
                    <Button variant="outlined" size="small" onClick={handleAddProduct}>
                      Add barcode to products
                    </Button>
                  </Stack>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {lookup.product ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Product
              </Typography>
              <Typography variant="h6">{lookup.product.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Category: {lookup.product.category}
              </Typography>
              {lookup.product.barcode ? (
                <Typography variant="body2" color="text.secondary">
                  Barcode: {lookup.product.barcode}
                </Typography>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {hasProduct ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Pick lists containing this product
              </Typography>
              {lookup.pickLists.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  This product is not in any pick lists yet.
                </Typography>
              ) : (
                <Stack divider={<Divider flexItem />} spacing={1}>
                  {lookup.pickLists.map(({ list, area }) => (
                    <Stack key={list.id} spacing={0.25}>
                      <Typography variant="body1">Pick List #{list.id.slice(0, 8)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Area: {area?.name ?? 'Unknown area'}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        ) : null}
      </Stack>
      <Dialog open={scannerOpen} onClose={() => setScannerOpen(false)} fullWidth>
        <DialogTitle>Scan a barcode</DialogTitle>
        <DialogContent>
          <BarcodeScannerView onDetected={handleDetected} />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default BarcodeScannerScreen