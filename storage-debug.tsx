import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StorageDebugger() {
  const [storageItems, setStorageItems] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllKeys();
  }, []);

  const loadAllKeys = async () => {
    try {
      setLoading(true);
      const keys = await AsyncStorage.getAllKeys();
      const result: Record<string, string> = {};
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        result[key] = value || '';
      }
      
      setStorageItems(result);
    } catch (error) {
      console.error('Error loading AsyncStorage keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllStorage = async () => {
    try {
      await AsyncStorage.clear();
      await loadAllKeys();
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AsyncStorage Debug</Text>
      <Button title="Refresh" onPress={loadAllKeys} />
      <Button title="Clear All Storage" onPress={clearAllStorage} />
      
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {Object.keys(storageItems).length === 0 ? (
            <Text>No items in AsyncStorage</Text>
          ) : (
            Object.entries(storageItems).map(([key, value]) => (
              <View key={key} style={styles.item}>
                <Text style={styles.key}>{key}</Text>
                <Text style={styles.value}>{
                  value.length > 300 
                    ? value.substring(0, 300) + '... (truncated)'
                    : value
                }</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 20,
  },
  item: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  key: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  value: {
    fontSize: 12,
  },
}); 