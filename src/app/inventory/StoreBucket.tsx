import * as React from 'react';
import { DimItem } from './item-types';
import classNames from 'classnames';
import { sortItems } from '../shell/dimAngularFilters.filter';
import './StoreBucket.scss';
import StoreBucketDropTarget from './StoreBucketDropTarget';
import { InventoryBucket } from './inventory-buckets';
import { DimStore } from './store-types';
import StoreInventoryItem from './StoreInventoryItem';
import { RootState } from '../store/reducers';
import { connect } from 'react-redux';
import { itemSortOrderSelector } from '../settings/item-sort';
import emptyEngram from '../../../destiny-icons/general/empty-engram.svg';
import * as _ from 'lodash';

// Props provided from parents
interface ProvidedProps {
  storeId: string;
  bucketId: string;
}

// Props from Redux via mapStateToProps
interface StoreProps {
  // TODO: which of these will actually update purely?
  items: DimItem[];
  bucket: InventoryBucket;
  store: DimStore;
  itemSortOrder: string[];
}

function mapStateToProps(state: RootState, props: ProvidedProps): StoreProps {
  const { storeId, bucketId } = props;
  const store = state.inventory.stores.find((s) => s.id === storeId)!;

  return {
    items: store.buckets[bucketId],
    bucket: state.inventory.buckets!.byId[props.bucketId],
    store,
    itemSortOrder: itemSortOrderSelector(state)
  };
}

type Props = ProvidedProps & StoreProps;

/**
 * A single bucket of items (for a single store).
 */
class StoreBucket extends React.Component<Props> {
  render() {
    const { items, itemSortOrder, bucket, store } = this.props;

    const equippedItem = items.find((i) => i.equipped);
    const unequippedItems = sortItems(items.filter((i) => !i.equipped), itemSortOrder);

    return (
      <div
        className={classNames('sub-section', `bucket-${bucket.id}`, {
          'not-equippable': !store.isVault && !equippedItem
        })}
      >
        {equippedItem && (
          <StoreBucketDropTarget equip={true} bucket={bucket} store={store}>
            <div className="equipped-item">
              <StoreInventoryItem key={equippedItem.index} item={equippedItem} />
            </div>
          </StoreBucketDropTarget>
        )}
        <StoreBucketDropTarget equip={false} bucket={bucket} store={store}>
          {unequippedItems.map((item) => (
            <StoreInventoryItem key={item.index} item={item} />
          ))}
          {bucket.id === '375726501' &&
            _.times(bucket.capacity - unequippedItems.length, (index) => (
              <img src={emptyEngram} className="empty-engram" key={index} />
            ))}
        </StoreBucketDropTarget>
      </div>
    );
  }
}

export default connect<StoreProps>(mapStateToProps)(StoreBucket);
