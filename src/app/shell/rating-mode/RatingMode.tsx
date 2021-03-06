import * as React from 'react';
import { t } from 'i18next';
import './RatingMode.scss';
import ClickOutside from '../../dim-ui/ClickOutside';
import { D2ManifestDefinitions, getDefinitions } from '../../destiny2/d2-definitions.service';
import { getReviewModes, D2ReviewMode } from '../../destinyTrackerApi/reviewModesFetcher';
import { D2StoresService } from '../../inventory/d2-stores.service';
import { reviewPlatformOptions } from '../../destinyTrackerApi/platformOptionsFetcher';
import { setSetting } from '../../settings/actions';
import store from '../../store/store';
import { connect } from 'react-redux';
import { RootState } from '../../store/reducers';
import { refresh } from '../refresh';
import { AppIcon, thumbsUpIcon, uploadIcon } from '../icons';
import { dimCuratedRollService } from '../../curated-rolls/curatedRollService';
import { updateCurations } from '../../curated-rolls/actions';
import { settings } from '../../settings/settings';
import HelpLink from '../../dim-ui/HelpLink';

interface StoreProps {
  reviewsModeSelection: number;
  platformSelection: number;
}

type Props = StoreProps;

interface State {
  open: boolean;
  defs?: D2ManifestDefinitions;
}

function mapStateToProps(state: RootState): StoreProps {
  return {
    reviewsModeSelection: state.settings.reviewsModeSelection,
    platformSelection: state.settings.reviewsPlatformSelection
  };
}

// TODO: observe Settings changes - changes in the reviews pane aren't reflected here without an app refresh.
class RatingMode extends React.Component<Props, State> {
  private dropdownToggler = React.createRef<HTMLElement>();
  private _reviewModeOptions?: D2ReviewMode[];

  private fileInput = React.createRef<HTMLInputElement>();

  constructor(props) {
    super(props);
    this.state = {
      open: false
    };
  }

  componentDidMount() {
    getDefinitions().then((defs) => this.setState({ defs }));
  }

  render() {
    const { open, defs } = this.state;
    const { reviewsModeSelection, platformSelection } = this.props;

    if (!defs) {
      return null;
    }

    return (
      <div>
        <span
          className="link"
          onClick={this.toggleDropdown}
          ref={this.dropdownToggler}
          title={t('DtrReview.RatingsOptions')}
        >
          <AppIcon icon={thumbsUpIcon} />
        </span>
        {open && (
          <ClickOutside onClickOutside={this.closeDropdown}>
            <div className="mode-popup">
              {settings.showReviews && (
                <>
                  <div className="mode-row">
                    <div className="mode-column">
                      <label className="mode-label" htmlFor="reviewMode">
                        {t('DtrReview.ForGameMode')}
                      </label>
                    </div>
                  </div>
                  <div className="mode-row">
                    <div className="mode-column">
                      <select
                        name="reviewMode"
                        value={reviewsModeSelection}
                        onChange={this.modeChange}
                      >
                        {this.reviewModeOptions.map((r) => (
                          <option key={r.mode} value={r.mode}>
                            {r.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mode-row">
                    <div className="mode-column">
                      <label className="mode-label" htmlFor="reviewMode">
                        {t('DtrReview.ForPlatform')}
                      </label>
                    </div>
                  </div>
                  <div className="mode-row">
                    <div className="mode-column">
                      <select
                        name="platformSelection"
                        value={platformSelection}
                        onChange={this.platformChange}
                      >
                        {reviewPlatformOptions.map((r) => (
                          <option key={r.description} value={r.platform}>
                            {t(r.description)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {$featureFlags.curatedRolls && (
                <>
                  <div className="mode-row">
                    <div className="mode-column">
                      <label className="mode-label" htmlFor="curatedRoll">
                        {t('CuratedRoll.Header')}
                        <HelpLink helpLink="https://github.com/DestinyItemManager/DIM/blob/master/docs/COMMUNITY_CURATIONS.md" />
                      </label>
                    </div>
                  </div>
                  <div className="mode-row">
                    <div className="mode-column">
                      <button className="dim-button" onClick={this.loadCurations}>
                        <AppIcon icon={uploadIcon} /> <span>{t('CuratedRoll.Import')}</span>
                      </button>
                      <br />
                      <input type="file" id="importFile" ref={this.fileInput} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </ClickOutside>
        )}
      </div>
    );
  }

  private get reviewModeOptions() {
    if (!this._reviewModeOptions) {
      this._reviewModeOptions = getReviewModes(this.state.defs);
    }
    return this._reviewModeOptions;
  }

  private toggleDropdown = () => {
    this.setState({ open: !this.state.open });
  };

  private closeDropdown = (e?) => {
    if (!e || !this.dropdownToggler.current || !this.dropdownToggler.current.contains(e.target)) {
      this.setState({ open: false });
    }
  };

  private modeChange = (e?) => {
    if (!e || !e.target) {
      return;
    }

    const newModeSelection = e.target.value;
    store.dispatch(setSetting('reviewsModeSelection', newModeSelection));
    D2StoresService.refreshRatingsData();
    refresh();
  };

  private platformChange = (e?) => {
    if (!e || !e.target) {
      return;
    }

    const newPlatformSelection = e.target.value;
    store.dispatch(setSetting('reviewsPlatformSelection', newPlatformSelection));
    D2StoresService.refreshRatingsData();
    refresh();
  };

  private loadCurations = (e) => {
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = () => {
      // TODO: we're kinda trusting that this is the right data here, no validation!
      if (reader.result && typeof reader.result === 'string') {
        dimCuratedRollService.loadCuratedRolls(reader.result);

        const storeRolls = D2StoresService.getStores();
        const inventoryCuratedRolls = dimCuratedRollService.getInventoryCuratedRolls(storeRolls);

        const curationActionData = {
          curationEnabled: dimCuratedRollService.curationEnabled,
          inventoryCuratedRolls
        };

        store.dispatch(updateCurations(curationActionData));
        refresh();
        alert(t('CuratedRoll.ImportSuccess'));
      }
    };

    const file = this.fileInput.current!.files![0];
    if (file) {
      reader.readAsText(file);
    } else {
      alert(t('CuratedRoll.ImportNoFile'));
    }
    return false;
  };
}

export default connect<StoreProps>(mapStateToProps)(RatingMode);
