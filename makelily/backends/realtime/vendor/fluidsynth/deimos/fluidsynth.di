module deimos.fluidsynth;

struct _fluid_hashtable_t;             /**< Configuration settings instance */
alias _fluid_synth_t = void;                    /**< Synthesizer instance */
struct _fluid_voice_t;                    /**< Synthesis voice instance */
struct _fluid_sfloader_t;              /**< SoundFont loader plugin */
struct _fluid_sfont_t;                    /**< SoundFont */
struct _fluid_preset_t;                  /**< SoundFont preset */
struct _fluid_sample_t;                  /**< SoundFont sample */
struct _fluid_mod_t;                        /**< SoundFont modulator */
struct _fluid_audio_driver_t;      /**< Audio driver instance */
struct _fluid_file_renderer_t;    /**< Audio file renderer instance */
struct _fluid_player_t;                  /**< MIDI player instance */
struct _fluid_midi_event_t;          /**< MIDI event */
struct _fluid_midi_driver_t;        /**< MIDI driver instance */
struct _fluid_midi_router_t;        /**< MIDI router instance */
struct _fluid_midi_router_rule_t;      /**< MIDI router rule */
struct _fluid_shell_t;                    /**< Command shell */
struct _fluid_server_t;                  /**< TCP/IP shell server instance */
struct _fluid_event_t;                    /**< Sequencer event */
struct _fluid_sequencer_t;            /**< Sequencer instance */
struct _fluid_ramsfont_t;              /**< RAM SoundFont */
struct _fluid_rampreset_t;            /**< RAM SoundFont preset */
alias int fluid_istream_t;    /**< Input stream descriptor */
alias int fluid_ostream_t;    /**< Output stream descriptor */

alias fluid_settings_t = _fluid_hashtable_t;             /**< Configuration settings instance */
alias fluid_synth_t = _fluid_synth_t;                    /**< Synthesizer instance */
alias fluid_synth_channel_info_t = _fluid_synth_channel_info_t;  /**< SoundFont channel info */
alias fluid_voice_t = _fluid_voice_t;                    /**< Synthesis voice instance */
alias fluid_sfloader_t = _fluid_sfloader_t;              /**< SoundFont loader plugin */
alias fluid_sfont_t = _fluid_sfont_t;                    /**< SoundFont */
alias fluid_preset_t = _fluid_preset_t;                  /**< SoundFont preset */
alias fluid_sample_t = _fluid_sample_t;                  /**< SoundFont sample */
alias fluid_mod_t = _fluid_mod_t;                        /**< SoundFont modulator */
alias fluid_audio_driver_t = _fluid_audio_driver_t;      /**< Audio driver instance */
alias fluid_file_renderer_t = _fluid_file_renderer_t;    /**< Audio file renderer instance */
alias fluid_player_t = _fluid_player_t;                  /**< MIDI player instance */
alias fluid_midi_event_t = _fluid_midi_event_t;          /**< MIDI event */
alias fluid_midi_driver_t = _fluid_midi_driver_t;        /**< MIDI driver instance */
alias fluid_midi_router_t = _fluid_midi_router_t;        /**< MIDI router instance */
alias fluid_midi_router_rule_t = _fluid_midi_router_rule_t;      /**< MIDI router rule */
alias fluid_cmd_handler_t = _fluid_hashtable_t;          /**< Command handler */
alias fluid_shell_t = _fluid_shell_t;                    /**< Command shell */
alias fluid_server_t = _fluid_server_t;                  /**< TCP/IP shell server instance */
alias fluid_event_t = _fluid_event_t;                    /**< Sequencer event */
alias fluid_sequencer_t = _fluid_sequencer_t;            /**< Sequencer instance */
alias fluid_ramsfont_t = _fluid_ramsfont_t;              /**< RAM SoundFont */
alias fluid_rampreset_t = _fluid_rampreset_t;            /**< RAM SoundFont preset */

/**
 * Hint FLUID_HINT_BOUNDED_BELOW indicates that the LowerBound field
 * of the FLUID_PortRangeHint should be considered meaningful. The
 * value in this field should be considered the (inclusive) lower
 * bound of the valid range. If FLUID_HINT_SAMPLE_RATE is also
 * specified then the value of LowerBound should be multiplied by the
 * sample rate.
 */
enum FLUID_HINT_BOUNDED_BELOW=0x1;

/** Hint FLUID_HINT_BOUNDED_ABOVE indicates that the UpperBound field
   of the FLUID_PortRangeHint should be considered meaningful. The
   value in this field should be considered the (inclusive) upper
   bound of the valid range. If FLUID_HINT_SAMPLE_RATE is also
   specified then the value of UpperBound should be multiplied by the
   sample rate. */
enum FLUID_HINT_BOUNDED_ABOVE=0x2;

/**
 * Hint FLUID_HINT_TOGGLED indicates that the data item should be
 * considered a Boolean toggle. Data less than or equal to zero should
 * be considered `off' or `false,' and data above zero should be
 * considered `on' or `true.' FLUID_HINT_TOGGLED may not be used in
 * conjunction with any other hint.
 */
enum FLUID_HINT_TOGGLED=0x4;

/**
 * Hint FLUID_HINT_SAMPLE_RATE indicates that any bounds specified
 * should be interpreted as multiples of the sample rate. For
 * instance, a frequency range from 0Hz to the Nyquist frequency (half
 * the sample rate) could be requested by this hint in conjunction
 * with LowerBound = 0 and UpperBound = 0.5. Hosts that support bounds
 * at all must support this hint to retain meaning.
 */
enum FLUID_HINT_SAMPLE_RATE=0x8;

/**
 * Hint FLUID_HINT_LOGARITHMIC indicates that it is likely that the
 * user will find it more intuitive to view values using a logarithmic
 * scale. This is particularly useful for frequencies and gains.
 */
enum FLUID_HINT_LOGARITHMIC=0x10;

/**
 * Hint FLUID_HINT_INTEGER indicates that a user interface would
 * probably wish to provide a stepped control taking only integer
 * values.
 * @deprecated
 *
 * As there is an integer setting type, this hint is not used.
 */
enum FLUID_HINT_INTEGER=0x20;


enum FLUID_HINT_FILENAME=0x01;         /**< String setting is a file name */
enum FLUID_HINT_OPTIONLIST=0x02;         /**< Setting is a list of string options */


/**
 * Settings type
 *
 * Each setting has a defined type: numeric (double), integer, string or a
 * set of values. The type of each setting can be retrieved using the
 * function fluid_settings_get_type()
 */
enum fluid_types_enum {
  FLUID_NO_TYPE = -1, /**< Undefined type */
  FLUID_NUM_TYPE,     /**< Numeric (double) */
  FLUID_INT_TYPE,     /**< Integer */
  FLUID_STR_TYPE,     /**< String */
  FLUID_SET_TYPE      /**< Set of values */
};


extern(C) fluid_settings_t* new_fluid_settings();
extern(C) void delete_fluid_settings(fluid_settings_t* settings);

extern(C)
int fluid_settings_get_type(fluid_settings_t* settings, const char *name);

extern(C)
int fluid_settings_get_hints(fluid_settings_t* settings, const char *name);

extern(C)
int fluid_settings_is_realtime(fluid_settings_t* settings, const char *name);

extern(C)
int fluid_settings_setstr(fluid_settings_t* settings, const char *name, const char *str);

extern(C)
int fluid_settings_copystr(fluid_settings_t* settings, const char *name, char *str, int len);

extern(C)
int fluid_settings_dupstr(fluid_settings_t* settings, const char *name, char** str);

extern(C)
int fluid_settings_getstr(fluid_settings_t* settings, const char *name, char** str);

extern(C)
char* fluid_settings_getstr_default(fluid_settings_t* settings, const char *name);

extern(C)
int fluid_settings_str_equal(fluid_settings_t* settings, const char *name, const char *value);

extern(C)
int fluid_settings_setnum(fluid_settings_t* settings, const char *name, double val);

extern(C)
int fluid_settings_getnum(fluid_settings_t* settings, const char *name, double* val);

extern(C)
double fluid_settings_getnum_default(fluid_settings_t* settings, const char *name);

extern(C)
void fluid_settings_getnum_range(fluid_settings_t* settings, const char *name,
				double* min, double* max);

extern(C)
int fluid_settings_setint(fluid_settings_t* settings, const char *name, int val);

extern(C)
int fluid_settings_getint(fluid_settings_t* settings, const char *name, int* val);

extern(C)
int fluid_settings_getint_default(fluid_settings_t* settings, const char *name);

extern(C)
void fluid_settings_getint_range(fluid_settings_t* settings, const char *name,
				int* min, int* max);

/**
 * Callback function type used with fluid_settings_foreach_option()
 * @param data User defined data pointer
 * @param name Setting name
 * @param option A string option for this setting (iterates through the list)
 */
alias void function(void *data, char *name, char *option) fluid_settings_foreach_option_t;

extern(C)
void fluid_settings_foreach_option(fluid_settings_t* settings,
				  const char* name, void* data,
				  fluid_settings_foreach_option_t func);
extern(C)
int fluid_settings_option_count (fluid_settings_t* settings, const char* name);
extern(C) char *fluid_settings_option_concat (fluid_settings_t* settings,
                                                   const char* name,
                                                   const char* separator);

/**
 * Callback function type used with fluid_settings_foreach()
 * @param data User defined data pointer
 * @param name Setting name
 * @param type Setting type (#fluid_types_enum)
 */
alias void function(void *data, char *name, int type) fluid_settings_foreach_t;

extern(C)
void fluid_settings_foreach(fluid_settings_t* settings, void* data,
			   fluid_settings_foreach_t func);

/**
 * @file synth.h
 * @brief Embeddable SoundFont synthesizer
 *  
 * You create a new synthesizer with new_fluid_synth() and you destroy
 * if with delete_fluid_synth(). Use the settings structure to specify
 * the synthesizer characteristics. 
 *
 * You have to load a SoundFont in order to hear any sound. For that
 * you use the fluid_synth_sfload() function.
 *
 * You can use the audio driver functions described below to open
 * the audio device and create a background audio thread.
 *  
 * The API for sending MIDI events is probably what you expect:
 * fluid_synth_noteon(), fluid_synth_noteoff(), ...
 */

enum FLUID_SYNTH_CHANNEL_INFO_NAME_SIZE=32;    /**< Length of channel info name field (including zero terminator) */

/**
 * Channel information structure for fluid_synth_get_channel_info().
 * @since 1.1.1
 */
struct _fluid_synth_channel_info_t
{
  byte assigned;     /**< TRUE if a preset is assigned, FALSE otherwise */
  /* Reserved flag bits (at the least 31) */
  int sfont_id;         /**< ID of parent SoundFont */
  int bank;             /**< MIDI bank number (0-16383) */
  int program;          /**< MIDI program number (0-127) */
  char[FLUID_SYNTH_CHANNEL_INFO_NAME_SIZE] name;     /**< Channel preset name */
  char[32] reserved;    /**< Reserved data for future expansion */
};

extern(C) fluid_synth_t* new_fluid_synth(fluid_settings_t* settings);
extern(C) int delete_fluid_synth(fluid_synth_t* synth);
extern(C) fluid_settings_t* fluid_synth_get_settings(fluid_synth_t* synth);


/* MIDI channel messages */

extern(C) int fluid_synth_noteon(fluid_synth_t* synth, int chan, int key, int vel);
extern(C) int fluid_synth_noteoff(fluid_synth_t* synth, int chan, int key);
extern(C) int fluid_synth_cc(fluid_synth_t* synth, int chan, int ctrl, int val);
extern(C) int fluid_synth_get_cc(fluid_synth_t* synth, int chan, int ctrl, int* pval);
extern(C) int fluid_synth_sysex(fluid_synth_t *synth, const char *data, int len,
                                     char *response, int *response_len, int *handled, int dryrun);
extern(C) int fluid_synth_pitch_bend(fluid_synth_t* synth, int chan, int val);
extern(C) int fluid_synth_get_pitch_bend(fluid_synth_t* synth, int chan, int* ppitch_bend);
extern(C) int fluid_synth_pitch_wheel_sens(fluid_synth_t* synth, int chan, int val);
extern(C) int fluid_synth_get_pitch_wheel_sens(fluid_synth_t* synth, int chan, int* pval);
extern(C) int fluid_synth_program_change(fluid_synth_t* synth, int chan, int program);
extern(C) int fluid_synth_channel_pressure(fluid_synth_t* synth, int chan, int val);
extern(C) int fluid_synth_bank_select(fluid_synth_t* synth, int chan, uint bank);
extern(C) int fluid_synth_sfont_select(fluid_synth_t* synth, int chan, uint sfont_id);
extern(C)
int fluid_synth_program_select(fluid_synth_t* synth, int chan, uint sfont_id,
                               uint bank_num, uint preset_num);
extern(C) int
fluid_synth_program_select_by_sfont_name (fluid_synth_t* synth, int chan,
                                          const char *sfont_name, uint bank_num,
                                          uint preset_num);
extern(C) 
int fluid_synth_get_program(fluid_synth_t* synth, int chan, uint* sfont_id, 
                            uint* bank_num, uint* preset_num);
extern(C) int fluid_synth_unset_program (fluid_synth_t *synth, int chan);
extern(C) int fluid_synth_get_channel_info (fluid_synth_t *synth, int chan,
                                                 fluid_synth_channel_info_t *info);
extern(C) int fluid_synth_program_reset(fluid_synth_t* synth);
extern(C) int fluid_synth_system_reset(fluid_synth_t* synth);

extern(C) int fluid_synth_all_notes_off(fluid_synth_t* synth, int chan);
extern(C) int fluid_synth_all_sounds_off(fluid_synth_t* synth, int chan);

enum fluid_midi_channel_type
{
  CHANNEL_TYPE_MELODIC = 0,
  CHANNEL_TYPE_DRUM = 1
};

int fluid_synth_set_channel_type(fluid_synth_t* synth, int chan, int type);


/* Low level access */
extern(C) fluid_preset_t* fluid_synth_get_channel_preset(fluid_synth_t* synth, int chan);
extern(C) int fluid_synth_start(fluid_synth_t* synth, uint id, 
				     fluid_preset_t* preset, int audio_chan, 
				     int midi_chan, int key, int vel);
extern(C) int fluid_synth_stop(fluid_synth_t* synth, uint id);


/* SoundFont management */

extern(C) 
int fluid_synth_sfload(fluid_synth_t* synth, const char* filename, int reset_presets);
extern(C) int fluid_synth_sfreload(fluid_synth_t* synth, uint id);
extern(C) int fluid_synth_sfunload(fluid_synth_t* synth, uint id, int reset_presets);
extern(C) int fluid_synth_add_sfont(fluid_synth_t* synth, fluid_sfont_t* sfont);
extern(C) void fluid_synth_remove_sfont(fluid_synth_t* synth, fluid_sfont_t* sfont);
extern(C) int fluid_synth_sfcount(fluid_synth_t* synth);
extern(C) fluid_sfont_t* fluid_synth_get_sfont(fluid_synth_t* synth, uint num);
extern(C) fluid_sfont_t* fluid_synth_get_sfont_by_id(fluid_synth_t* synth, uint id);
extern(C) fluid_sfont_t *fluid_synth_get_sfont_by_name (fluid_synth_t* synth,
                                                             const char *name);
extern(C) int fluid_synth_set_bank_offset(fluid_synth_t* synth, int sfont_id, int offset);
extern(C) int fluid_synth_get_bank_offset(fluid_synth_t* synth, int sfont_id);


/* Reverb  */

extern(C) void fluid_synth_set_reverb(fluid_synth_t* synth, double roomsize, 
					   double damping, double width, double level);
extern(C) void fluid_synth_set_reverb_on(fluid_synth_t* synth, int on);
extern(C) double fluid_synth_get_reverb_roomsize(fluid_synth_t* synth);
extern(C) double fluid_synth_get_reverb_damp(fluid_synth_t* synth);
extern(C) double fluid_synth_get_reverb_level(fluid_synth_t* synth);
extern(C) double fluid_synth_get_reverb_width(fluid_synth_t* synth);

enum FLUID_REVERB_DEFAULT_ROOMSIZE=0.2f;      /**< Default reverb room size */
enum FLUID_REVERB_DEFAULT_DAMP=0.0f;          /**< Default reverb damping */
enum FLUID_REVERB_DEFAULT_WIDTH=0.5f;         /**< Default reverb width */
enum FLUID_REVERB_DEFAULT_LEVEL=0.9f;         /**< Default reverb level */


/* Chorus */

/**
 * Chorus modulation waveform type.
 */
enum fluid_chorus_mod {
  FLUID_CHORUS_MOD_SINE = 0,            /**< Sine wave chorus modulation */
  FLUID_CHORUS_MOD_TRIANGLE = 1         /**< Triangle wave chorus modulation */
};

extern(C) void fluid_synth_set_chorus(fluid_synth_t* synth, int nr, double level, 
					 double speed, double depth_ms, int type);
extern(C) void fluid_synth_set_chorus_on(fluid_synth_t* synth, int on);
extern(C) int fluid_synth_get_chorus_nr(fluid_synth_t* synth);
extern(C) double fluid_synth_get_chorus_level(fluid_synth_t* synth);
extern(C) double fluid_synth_get_chorus_speed_Hz(fluid_synth_t* synth);
extern(C) double fluid_synth_get_chorus_depth_ms(fluid_synth_t* synth);
extern(C) int fluid_synth_get_chorus_type(fluid_synth_t* synth); /* see fluid_chorus_mod */

enum FLUID_CHORUS_DEFAULT_N=3;                                /**< Default chorus voice count */
enum FLUID_CHORUS_DEFAULT_LEVEL=2.0f;                         /**< Default chorus level */
enum FLUID_CHORUS_DEFAULT_SPEED=0.3f;                         /**< Default chorus speed */
enum FLUID_CHORUS_DEFAULT_DEPTH=8.0f;                         /**< Default chorus depth */
enum FLUID_CHORUS_DEFAULT_TYPE=fluid_chorus_mod.FLUID_CHORUS_MOD_SINE;         /**< Default chorus waveform type */


/* Audio and MIDI channels */

extern(C) int fluid_synth_count_midi_channels(fluid_synth_t* synth);
extern(C) int fluid_synth_count_audio_channels(fluid_synth_t* synth);
extern(C) int fluid_synth_count_audio_groups(fluid_synth_t* synth);
extern(C) int fluid_synth_count_effects_channels(fluid_synth_t* synth);


/* Synthesis parameters */

extern(C) void fluid_synth_set_sample_rate(fluid_synth_t* synth, float sample_rate);
extern(C) void fluid_synth_set_gain(fluid_synth_t* synth, float gain);
extern(C) float fluid_synth_get_gain(fluid_synth_t* synth);
extern(C) int fluid_synth_set_polyphony(fluid_synth_t* synth, int polyphony);
extern(C) int fluid_synth_get_polyphony(fluid_synth_t* synth);
extern(C) int fluid_synth_get_active_voice_count(fluid_synth_t* synth);
extern(C) int fluid_synth_get_internal_bufsize(fluid_synth_t* synth);

extern(C) 
int fluid_synth_set_interp_method(fluid_synth_t* synth, int chan, int interp_method);

/**
 * Synthesis interpolation method.
 */
enum fluid_interp {
  FLUID_INTERP_NONE = 0,        /**< No interpolation: Fastest, but questionable audio quality */
  FLUID_INTERP_LINEAR = 1,      /**< Straight-line interpolation: A bit slower, reasonable audio quality */
  FLUID_INTERP_4THORDER = 4,    /**< Fourth-order interpolation, good quality, the default */
  FLUID_INTERP_7THORDER = 7     /**< Seventh-order interpolation */
};

enum FLUID_INTERP_DEFAULT=fluid_interp.FLUID_INTERP_4THORDER;   /**< Default interpolation method from #fluid_interp. */
enum FLUID_INTERP_HIGHEST=fluid_interp.FLUID_INTERP_7THORDER;   /**< Highest interpolation method from #fluid_interp. */


/* Generator interface */

extern(C) 
int fluid_synth_set_gen(fluid_synth_t* synth, int chan, int param, float value);
extern(C) int fluid_synth_set_gen2 (fluid_synth_t* synth, int chan,
                                         int param, float value,
                                         int absolute, int normalized);
extern(C) float fluid_synth_get_gen(fluid_synth_t* synth, int chan, int param);


/* Tuning */

extern(C) 
int fluid_synth_create_key_tuning(fluid_synth_t* synth, int bank, int prog,
				  const char* name, const double* pitch);
extern(C)
int fluid_synth_activate_key_tuning(fluid_synth_t* synth, int bank, int prog,
                                    const char* name, const double* pitch, int apply);
extern(C) 
int fluid_synth_create_octave_tuning(fluid_synth_t* synth, int bank, int prog,
                                     const char* name, const double* pitch);
extern(C)
int fluid_synth_activate_octave_tuning(fluid_synth_t* synth, int bank, int prog,
                                       const char* name, const double* pitch, int apply);
extern(C) 
int fluid_synth_tune_notes(fluid_synth_t* synth, int bank, int prog,
			   int len, const int *keys, const double* pitch, int apply);
extern(C) 
int fluid_synth_select_tuning(fluid_synth_t* synth, int chan, int bank, int prog);
extern(C)
int fluid_synth_activate_tuning(fluid_synth_t* synth, int chan, int bank, int prog,
                                int apply);
extern(C) int fluid_synth_reset_tuning(fluid_synth_t* synth, int chan);
extern(C)
int fluid_synth_deactivate_tuning(fluid_synth_t* synth, int chan, int apply);
extern(C) void fluid_synth_tuning_iteration_start(fluid_synth_t* synth);
extern(C) 
int fluid_synth_tuning_iteration_next(fluid_synth_t* synth, int* bank, int* prog);
extern(C) int fluid_synth_tuning_dump(fluid_synth_t* synth, int bank, int prog, 
					   char* name, int len, double* pitch);

/* Misc */

extern(C) double fluid_synth_get_cpu_load(fluid_synth_t* synth);
extern(C) char* fluid_synth_error(fluid_synth_t* synth);


/*
 * Synthesizer plugin
 *
 * To create a synthesizer plugin, create the synthesizer as
 * explained above. Once the synthesizer is created you can call
 * any of the functions below to get the audio. 
 */

extern(C) int fluid_synth_write_s16(fluid_synth_t* synth, int len, 
				       void* lout, int loff, int lincr, 
				       void* rout, int roff, int rincr);
extern(C) int fluid_synth_write_float(fluid_synth_t* synth, int len, 
					 void* lout, int loff, int lincr, 
					 void* rout, int roff, int rincr);
extern(C) int fluid_synth_nwrite_float(fluid_synth_t* synth, int len, 
					  float** left, float** right, 
					  float** fx_left, float** fx_right);
extern(C) int fluid_synth_process(fluid_synth_t* synth, int len,
				     int nin, float** fin, 
				     int nout, float** fout);

/**
 * Type definition of the synthesizer's audio callback function.
 * @param synth FluidSynth instance
 * @param len Count of audio frames to synthesize
 * @param out1 Array to store left channel of audio to
 * @param loff Offset index in 'out1' for first sample
 * @param lincr Increment between samples stored to 'out1'
 * @param out2 Array to store right channel of audio to
 * @param roff Offset index in 'out2' for first sample
 * @param rincr Increment between samples stored to 'out2'
 */
alias int function(fluid_synth_t* synth, int len, 
    void* out1, int loff, int lincr, 
    void* out2, int roff, int rincr) fluid_audio_callback_t;

/* Synthesizer's interface to handle SoundFont loaders */

extern(C) void fluid_synth_add_sfloader(fluid_synth_t* synth, fluid_sfloader_t* loader);
extern(C) fluid_voice_t* fluid_synth_alloc_voice(fluid_synth_t* synth, fluid_sample_t* sample,
                                                      int channum, int key, int vel);
extern(C) void fluid_synth_start_voice(fluid_synth_t* synth, fluid_voice_t* voice);
extern(C) void fluid_synth_get_voicelist(fluid_synth_t* synth,
                                              fluid_voice_t** buf, int bufsize, int ID);
extern(C) int fluid_synth_handle_midi_event(void* data, fluid_midi_event_t* event);
extern(C) void fluid_synth_set_midi_router(fluid_synth_t* synth,
                                                fluid_midi_router_t* router);
